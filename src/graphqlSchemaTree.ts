import deepcopy from "deepcopy";
import { GraphQLSchema } from "graphql";
import selectn from "selectn";
import { traverse } from "./handler";
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

  getNodeAsRoot(path: string): SchemaNode | null {
    const node = selectn(path, this.tree) as SchemaNode | undefined;
    if (node === undefined) {
      return null;
    }

    const copied = deepcopy(node);
    copied.__info.parentName = "";
    copied.__info.parentPath = "";
    copied.__info.path = copied.__info.name;

    const depth = (path.match(/\./g) || []).length;
    const parent = new RegExp(path.split(".", depth).join(".") + ".");
    traverse(copied, "depthFirst", (_, node) => {
      const info = node.__info;
      info.path = info.path.replace(parent, "");
      info.parentPath = info.parentPath.replace(parent, "");
    });
    return copied;
  }

  getFieldNames(): string[] {
    const rootName = this.option.typeName!.toLowerCase();
    return this.tree[rootName].__info.children;
  }
}
