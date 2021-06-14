import deepcopy from "deepcopy";
import { GraphQLSchema } from "graphql";
import selectn from "selectn";
import { SchemaNode } from "./node";
import { buildSchemaTree, SchemaTree, SchemaTreeOption } from "./tree";

const defaultSchemaTreeOption: SchemaTreeOption = {
  typeName: "Query",
  maxDepth: 5,
};

export class GraphQLSchemaTree {
  private schema: GraphQLSchema;
  readonly option: SchemaTreeOption;
  readonly tree: SchemaTree;

  constructor(
    schema: GraphQLSchema,
    _option: SchemaTreeOption = defaultSchemaTreeOption
  ) {
    this.schema = schema;
    this.option = { ...defaultSchemaTreeOption, ..._option };
    this.tree = buildSchemaTree(schema, this.option);
  }

  getNode(path: string, isCopy = false): SchemaNode | null {
    const node = selectn(path, this.tree) as SchemaNode | undefined;
    if (node === undefined) {
      return null;
    }
    return isCopy ? deepcopy(node) : node;
  }

  getFieldNames(): string[] {
    const rootName = this.option.typeName!.toLowerCase();
    return this.tree[rootName].__info.children;
  }
}
