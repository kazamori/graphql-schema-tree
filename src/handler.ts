import {
  coerceInputValue,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLObjectType,
} from "graphql";
import { ArgumentInfo, SchemaNode, SchemaNodeInfo } from "./node";
import { isInternalField } from "./tree";

export type Traversing = "depthFirst" | "breadthFirst";

function traverse(
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
}
