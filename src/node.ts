import {
  GraphQLArgument,
  GraphQLField,
  GraphQLNamedType,
  GraphQLType,
  isListType,
  isNonNullType,
} from "graphql";

export type SchemaNodeInfo = {
  name: string;
  parentName: string;
  parentPath: string;
  path: string;
  args: ArgumentInfo[];
  type: TypeInfo;
  children: string[];
  isMaxDepth: boolean;
};

export interface SchemaNode {
  __info: SchemaNodeInfo;
  [key: string]: SchemaNodeInfo | SchemaNode;
}

export type TypeInfo = {
  graphQLType: GraphQLNamedType;
  isList: boolean;
  isNonNull: boolean;
  isAppeared: boolean;
};

export function getType<T extends GraphQLType>(
  type: T & { readonly ofType: T },
  isList = false,
  isNonNull = false,
  isAppeared = false,
  depth = 0
): TypeInfo {
  // FIXME: how to check list/nonnull for a wrapping type
  // this function unwraps the given type step by step
  // e.g.) [[User]!]! => [[User]!] => [User]! => [User] => User
  if (!isList) {
    isList = isListType(type);
  }
  if (!isNonNull) {
    isNonNull = isNonNullType(type);
  }
  if (type.ofType && depth < 8) {
    return getType(type.ofType, isList, isNonNull, isAppeared, depth + 1);
  }
  return {
    graphQLType: type as GraphQLNamedType,
    isList,
    isNonNull,
    isAppeared,
  };
}

export type ArgumentInfo = {
  name: string;
  type: TypeInfo;
  defaultValue: any;
};

function getArgument(arg: GraphQLArgument): ArgumentInfo {
  return {
    name: arg.name,
    defaultValue: arg.defaultValue,
    type: getType(arg.type),
  };
}

export function createSchemaNode(
  name: string,
  parentPath: string,
  field: GraphQLField<any, any>
): SchemaNode {
  return {
    __info: {
      name: name,
      parentName: parentPath.split(".").pop() ?? "",
      parentPath: parentPath,
      path: `${parentPath}.${name}`,
      args: field.args.map((arg) => getArgument(arg)),
      type: getType(field.type),
      children: [],
      isMaxDepth: false,
    },
  };
}
