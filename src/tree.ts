import { GraphQLObjectType, GraphQLOutputType, GraphQLSchema } from "graphql";
import selectn from "selectn";
import { createSchemaNode, getType, SchemaNode } from "./node";

export type SchemaTree = {
  [key: string]: SchemaNode;
};

export type SchemaTreeOption = {
  maxDepth: number;
  typeName?: string;
};

/*
 GraphQL reserves fields named with two underscores (e.g. __Type)
 to preserve the namespace for introspection features.
 Similarly, SchemaNode handles the prefixed field name as an internal field.
*/
const reservedFieldPrefix = "__";

export function isInternalField(name: string) {
  return name.startsWith(reservedFieldPrefix);
}

function buildTree(tree: SchemaNode, depth: number, option: SchemaTreeOption) {
  const fieldMap = (
    tree.__info.type.graphQLType as GraphQLObjectType
  ).getFields();
  Object.entries(fieldMap).map(([key, field]) => {
    if (isInternalField(key)) {
      return;
    }
    const node = createSchemaNode(key, tree.__info.path, field, depth);
    tree.__info.children.push(key);
    tree[key] = node;
    if (node.__info.type.graphQLType instanceof GraphQLObjectType) {
      if (depth < option.maxDepth) {
        buildTree(node, depth + 1, option);
      } else {
        node.__info.isMaxDepth = true;
      }
    }
    return;
  });
}

export function buildSchemaTree(
  schema: GraphQLSchema,
  option: SchemaTreeOption
): SchemaTree {
  const rootName = option.typeName!.toLowerCase();
  const type = schema.getType(option.typeName!);
  if (type == null) {
    return {};
  }

  const tree: SchemaTree = {
    [rootName]: {
      __info: {
        name: option.typeName!.toLocaleLowerCase(),
        parentName: "",
        parentPath: "",
        path: rootName,
        args: [],
        type: getType(type as GraphQLOutputType),
        children: [],
        depth: 0,
        isMaxDepth: false,
      },
    },
  };

  const fieldMap = (type as GraphQLObjectType).getFields();
  Object.entries(fieldMap).map(([key, field]) => {
    if (isInternalField(key)) {
      return;
    }
    const node = createSchemaNode(key, rootName, field, 1);
    tree[rootName].__info.children.push(key);
    tree[rootName][key] = node;
    if (node.__info.type.graphQLType instanceof GraphQLObjectType) {
      buildTree(node, 2, option);
    }
  });

  return tree;
}

export function getParent(
  tree: SchemaTree,
  node: SchemaNode,
  prefix = ""
): SchemaNode | null {
  const parentPath = `${prefix}${node.__info.parentPath}`;
  const parent = selectn(parentPath, tree);
  if (parent === undefined) {
    return null;
  }
  return parent;
}
