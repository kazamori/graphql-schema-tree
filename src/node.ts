import {
  GraphQLArgument,
  GraphQLArgumentExtensions,
  GraphQLField,
  GraphQLInputType,
  GraphQLNamedType,
  GraphQLType,
  isListType,
  isNonNullType,
} from "graphql";
import { Maybe } from "graphql/jsutils/Maybe";

export type SchemaNodeInfo = {
  name: string;
  parentName: string;
  parentPath: string;
  path: string;
  args: ArgumentInfo[];
  type: TypeInfo;
  children: string[];
  depth: number;
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
};

export function getType<T extends GraphQLType>(
  type: T & { readonly ofType: T },
  isList = false,
  isNonNull = false,
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
    return getType(type.ofType, isList, isNonNull, depth + 1);
  }
  return {
    graphQLType: type as GraphQLNamedType,
    isList,
    isNonNull,
  };
}

// NOTE: almost the same as GraphQLArgument, delete astNode for deepcopy
export type ArgumentInfo = {
  name: string;
  description: Maybe<string>;
  type: GraphQLInputType;
  defaultValue: any;
  deprecationReason: Maybe<string>;
  extensions: Maybe<Readonly<GraphQLArgumentExtensions>>;
};

function getArgument(arg: GraphQLArgument): ArgumentInfo {
  const _arg = {
    ...arg,
  };
  delete _arg.astNode;
  return _arg;
}

export function createSchemaNode(
  name: string,
  parentPath: string,
  field: GraphQLField<any, any>,
  depth: number
): SchemaNode {
  return {
    __info: {
      name,
      parentName: parentPath.split(".").pop() ?? "",
      parentPath,
      path: `${parentPath}.${name}`,
      args: field.args.map((arg) => getArgument(arg)),
      type: getType(field.type),
      children: [],
      depth,
      isMaxDepth: false,
    },
  };
}
