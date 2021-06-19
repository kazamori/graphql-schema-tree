import {
  coerceInputValue,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLNamedType,
  GraphQLObjectType,
  parseValue,
  valueFromAST,
} from "graphql";
import selectn from "selectn";
import { ArgumentInfo, SchemaNode, SchemaNodeInfo } from "./node";
import { isInternalField, SchemaTree } from "./tree";

export type Traversing = "depthFirst" | "breadthFirst";

export type TraverseOption = {
  traversing: Traversing;
  hiddenPaths?: (string | RegExp)[];
};

const defaultTraverseOption: TraverseOption = {
  traversing: "depthFirst",
  hiddenPaths: [],
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

  isArgumentObject(arg: ArgumentInfo) {
    return arg.type.graphQLType instanceof GraphQLInputObjectType;
  }

  getArgumentObject(arg: ArgumentInfo) {
    const type = arg.type.graphQLType as GraphQLInputObjectType;
    return type.getFields();
  }

  validateValue(value: any, type: GraphQLInputType) {
    // if validation is successful, return null.
    // if not, return an error message.
    let message: string | null = null;
    coerceInputValue(value, type, (path, invalidValue, error) => {
      message = error.message;
    });
    return message;
  }

  validateArgument(name: string, value: any) {
    const arg = this.getArgument(name);
    if (arg === null) {
      return false;
    }
    const type = arg.type.graphQLType as GraphQLInputType;
    return this.validateValue(value, type);
  }

  convertArgumentValue(name: string, value: string) {
    const arg = this.getArgument(name);
    if (arg === null) {
      return null;
    }
    const type = arg.type.graphQLType;
    if (type.name === "String") {
      return value;
    }
    const valueNode = parseValue(value, { noLocation: true });
    return valueFromAST(valueNode, type as GraphQLInputType);
  }

  getFieldNames() {
    return this.node.__info.children;
  }

  getFields() {
    return this.node.__info.children.map((key) => this.node[key] as SchemaNode);
  }

  setIsAppeared(traversing: Traversing) {
    const appeared = new Map<string, boolean>();
    traverse(this.node, traversing, (_, node) => {
      const type = node.__info.type;
      if (type.graphQLType instanceof GraphQLObjectType) {
        const typeName = type.graphQLType.toString();
        if (appeared.has(typeName)) {
          type.isAppeared = true;
        } else {
          appeared.set(typeName, true);
        }
      }
    });
    return this;
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
    if (!this.isHiddenNode(this.node, option)) {
      callback(this.node);
    }
    traverse(this.node, option.traversing, (_, node) => {
      if (!this.isHiddenNode(node, option)) {
        callback(node);
      }
    });
  }
}
