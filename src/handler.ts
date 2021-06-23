import {
  coerceInputValue,
  GraphQLInputField,
  GraphQLInputFieldMap,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLNamedType,
  GraphQLScalarType,
  GraphQLString,
} from "graphql";
import selectn from "selectn";
import {
  ArgumentInfo,
  getType,
  SchemaNode,
  SchemaNodeInfo,
  TypeInfo,
} from "./node";
import { isInternalField, SchemaTree } from "./tree";

export type ConvertArgumentValueOption = {
  useTypeForID: GraphQLScalarType;
};

const defaultConvertArgumentValueOption: ConvertArgumentValueOption = {
  useTypeForID: GraphQLString,
};

export type ArgumentValueInfo = {
  value: any | null;
  type: TypeInfo;
  parentType: TypeInfo | null;
};

export type Traversing = "depthFirst" | "breadthFirst";

export type TraverseOption = {
  traversing: Traversing;
  hiddenPaths?: (string | RegExp)[];
  excludeRoot?: boolean;
};

const defaultTraverseOption: TraverseOption = {
  traversing: "depthFirst",
  hiddenPaths: [],
  excludeRoot: false,
};

export function traverse(
  node: SchemaNode,
  traversing: Traversing,
  callback: (info: SchemaNodeInfo, node: SchemaNode) => void
) {
  let info: SchemaNodeInfo | undefined;
  let nodes: SchemaNode[] = [];
  Object.entries(node).forEach(([key, nodeOrInfo]) => {
    if (isInternalField(key)) {
      info = nodeOrInfo as SchemaNodeInfo;
    } else {
      nodes.push(nodeOrInfo as SchemaNode);
    }
  });

  switch (traversing) {
    case "depthFirst":
      for (const node of nodes) {
        callback(info as SchemaNodeInfo, node);
        traverse(node, traversing, callback);
      }
      break;
    case "breadthFirst":
      for (const node of nodes) {
        callback(info as SchemaNodeInfo, node);
      }
      for (const node of nodes) {
        traverse(node, traversing, callback);
      }
      break;
    default:
      throw new Error(`Unsupported traversing: ${traversing}`);
  }
}

export class SchemaNodeHandler {
  readonly node: SchemaNode;
  constructor(node: SchemaNode) {
    this.node = node;
  }

  getNode(path: string): SchemaNode | null {
    const root = path.split(".", 1)[0];
    if (root === "") {
      return null;
    }
    const tree: SchemaTree = { [root]: this.node };
    const node = selectn(path, tree) as SchemaNode | undefined;
    return node === undefined ? null : node;
  }

  hasSameTypeInHierarchy(type: GraphQLNamedType, parentPath: string): boolean {
    // NOTE: only works with GraphQLSchemaTree.getNodeAsRoot
    const parent = this.getNode(parentPath);
    if (parent == null) {
      return false;
    }
    if (parent.__info.type.graphQLType === type) {
      return true;
    }
    return this.hasSameTypeInHierarchy(type, parent.__info.parentPath);
  }

  getArgumentNames() {
    return this.node.__info.args.map((arg) => arg.name);
  }

  getArguments() {
    return this.node.__info.args;
  }

  getArgument(name: string) {
    const args = this.node.__info.args.filter((arg) => arg.name === name);
    return args.length === 1 ? args[0] : null;
  }

  getArgumentInputFieldMap(): Map<string, GraphQLInputField> {
    const search = (
      name: string,
      field: GraphQLInputField,
      result: Map<string, GraphQLInputField>
    ) => {
      if (field.type instanceof GraphQLInputObjectType) {
        Object.values(field.type.getFields()).forEach((subField) => {
          search(`${name}.${subField.name}`, subField, result);
        });
      } else {
        result.set(name, field);
      }
    };
    const fieldMap = new Map<string, GraphQLInputField>();
    this.getArgumentNames().forEach((name) => {
      search(name, this.getArgumentInputField(name)!, fieldMap);
    });
    return fieldMap;
  }

  getArgumentInputFields(arg: string | ArgumentInfo) {
    const _arg = typeof arg === "string" ? this.getArgument(arg) : arg;
    if (_arg === null) {
      return null;
    }
    if (!(_arg.type instanceof GraphQLInputObjectType)) {
      return null;
    }
    return _arg.type.getFields();
  }

  getArgumentInputField(
    name: string,
    fieldMap?: GraphQLInputFieldMap
  ): GraphQLInputField | null {
    if (!name.includes(".")) {
      return this.getArgument(name);
    }

    const [argName, ...subProperties] = name.split(".");
    const fields =
      fieldMap === undefined ? this.getArgumentInputFields(argName) : fieldMap;
    if (fields === null) {
      return null;
    }
    const subField = fields[subProperties[0]];
    if (subField === undefined) {
      return null;
    }
    if (subProperties.length === 1) {
      return subField;
    }
    const subFields = (subField.type as GraphQLInputObjectType).getFields();
    return this.getArgumentInputField(subProperties.join("."), subFields);
  }

  validateInputValue(value: any, type: GraphQLInputType) {
    // if validation is successful, return null.
    // if not, return an error message.
    let message: string | null = null;
    coerceInputValue(value, type, (path, invalidValue, error) => {
      message = error.message;
    });
    return message;
  }

  validateArgument(name: string, value: any) {
    const inputField = this.getArgumentInputField(name);
    if (inputField === null) {
      return false;
    }
    return this.validateInputValue(value, inputField.type);
  }

  convertValue(value: string, type: GraphQLNamedType) {
    let parseFunction: Function;
    if (type.name === "String") {
      return value;
    } else if (type.name === "Int") {
      parseFunction = parseInt;
    } else if (type.name === "Float") {
      parseFunction = parseFloat;
    } else if (type.name === "Boolean") {
      parseFunction = (value: string) => {
        if (value === "true" || value === "false") {
          return value === "true";
        }
        return null;
      };
    } else {
      // handles string for custom scalar types or others
      return value;
    }
    try {
      return parseFunction(value);
    } catch {
      return null;
    }
  }

  convertArgumentValue(
    name: string,
    value: string,
    option = defaultConvertArgumentValueOption
  ): ArgumentValueInfo | null {
    const arg = this.getArgumentInputField(name);
    if (arg === null) {
      return null;
    }

    const depth = (name.match(/\./g) || []).length;
    const parentName = name.split(".", depth).join(".");
    const parentType =
      depth === 0
        ? null
        : getType(this.getArgumentInputField(parentName)!.type);
    const typeInfo = getType(arg.type);
    const type = typeInfo.graphQLType as GraphQLScalarType;
    if (typeInfo.isList) {
      return {
        value: value.split(",").map((v) => this.convertValue(v.trim(), type)),
        type: typeInfo,
        parentType: parentType,
      };
    }

    const scalarType =
      typeInfo.graphQLType.name === "ID" ? option.useTypeForID : type;
    return {
      value: this.convertValue(value, scalarType),
      type: typeInfo,
      parentType: parentType,
    };
  }

  getFieldNames() {
    return this.node.__info.children;
  }

  getFields() {
    return this.node.__info.children.map((key) => this.node[key] as SchemaNode);
  }

  isHiddenNode(node: SchemaNode, option: TraverseOption) {
    const path = node.__info.path;
    if (option.hiddenPaths !== undefined) {
      for (const hiddenPath of option.hiddenPaths) {
        if (typeof hiddenPath === "string") {
          if (path === hiddenPath) {
            return true;
          }
        } else {
          if (path.match(hiddenPath) !== null) {
            return true;
          }
        }
      }
    }
    return false;
  }

  traverseNode(callback: (node: SchemaNode) => void, _option?: TraverseOption) {
    const option = { ...defaultTraverseOption, ..._option };
    if (!(option.excludeRoot || this.isHiddenNode(this.node, option))) {
      callback(this.node);
    }
    const root = this.node.__info.name;
    traverse(this.node, option.traversing, (_, node) => {
      if (option.excludeRoot) {
        const rootPath = new RegExp(`${root}\\.?`);
        const info = node.__info;
        info.path = info.path.replace(rootPath, "");
        info.parentPath = info.parentPath.replace(rootPath, "");
        info.depth = info.depth - 1;
      }
      if (!this.isHiddenNode(node, option)) {
        callback(node);
      }
    });
  }
}
