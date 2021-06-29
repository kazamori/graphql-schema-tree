import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLSchema,
} from "graphql";
import path from "path";
import { GraphQLSchemaTree } from "../src/graphqlSchemaTree";
import { SchemaNodeHandler } from "../src/handler";
import { SchemaNode } from "../src/node";
import { getSchema } from "../src/util";

const schema1Path = path.resolve(__dirname, "./schema1.graphql");
let schema1: GraphQLSchema;
let tree1: GraphQLSchemaTree;

beforeAll((done) => {
  const before = async () => {
    schema1 = await getSchema({ pathOrEndpoint: schema1Path });
    tree1 = new GraphQLSchemaTree(schema1, {
      typeName: "Query",
      maxDepth: 5,
    });
    done();
  };
  before();
});

test("handler.getNode", async () => {
  const node = tree1.getNode("query.myquery.data")!;
  const handler = new SchemaNodeHandler(node);
  const user = handler.getNode("data.user")!;
  expect(user).not.toBeNull();
  expect(user.__info.name).toEqual("user");
  expect(user.__info.path).toEqual("query.myquery.data.user");
});

test("handler.hasSameTypeInHierarchy under data", async () => {
  const node = tree1.getNodeAsRoot("query.myquery.data")!;
  const handler = new SchemaNodeHandler(node);
  const users = handler.getNode("data.user.company.users")!;
  expect(users.__info.path).toEqual("data.user.company.users");
  expect(
    handler.hasSameTypeInHierarchy(
      users.__info.type.graphQLType,
      users.__info.parentPath
    )
  ).toBeTruthy();
  const company = handler.getNode("data.user.company")!;
  expect(company.__info.path).toEqual("data.user.company");
  expect(
    handler.hasSameTypeInHierarchy(
      company.__info.type.graphQLType,
      company.__info.parentPath
    )
  ).toBeFalsy();
});

test("handler.hasSameTypeInHierarchy under user", async () => {
  const node = tree1.getNodeAsRoot("query.myquery.data.user")!;
  const handler = new SchemaNodeHandler(node);
  const users = handler.getNode("user.company.users")!;
  expect(users.__info.path).toEqual("user.company.users");
  expect(
    handler.hasSameTypeInHierarchy(
      users.__info.type.graphQLType,
      users.__info.parentPath
    )
  ).toBeTruthy();
  const company = handler.getNode("user.company")!;
  expect(company.__info.path).toEqual("user.company");
  expect(
    handler.hasSameTypeInHierarchy(
      company.__info.type.graphQLType,
      company.__info.parentPath
    )
  ).toBeFalsy();
});

test("handler.getArgumentNames", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  expect(handler.getArgumentNames()).toEqual([
    "limit",
    "offset",
    "sort",
    "filter",
    "ids1",
    "ids2",
    "ids3",
    "ids4",
  ]);
});

test("handler.getArguments", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  const args = handler.getArguments();
  expect(args.length).toEqual(8);
  expect(args[0].name).toEqual("limit");
  expect(
    (args[0].type as GraphQLNonNull<GraphQLScalarType>).ofType.name
  ).toEqual("Int");
  expect(args[2].name).toEqual("sort");
  expect((args[2].type as GraphQLInputObjectType).name).toEqual("SortInput");
});

test("handler.getArgument", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  const filter = handler.getArgument("filter")!;
  expect(filter).not.toBeNull();
  expect(filter.name).toEqual("filter");
  expect((filter.type as GraphQLInputObjectType).name).toEqual("FilterInput");
});

test("handler.getArgumentInputFieldMap", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  const fieldMap = handler.getArgumentInputFieldMap();
  expect(fieldMap.size).toEqual(17);
  expect(fieldMap.get("limit")?.type.toString()).toEqual("Int!");
  expect(fieldMap.get("offset")?.type.toString()).toEqual("Int");
  expect(fieldMap.get("sort.by")?.type.toString()).toEqual("Sortable");
  expect(fieldMap.get("sort.desc")?.type.toString()).toEqual("Boolean");
  expect(fieldMap.get("ids4")?.type.toString()).toEqual("[Int!]!");
  expect(fieldMap.get("filter.date")?.type.toString()).toEqual("DateTime!");
  expect(fieldMap.get("filter.user.username")?.type.toString()).toEqual(
    "String"
  );
});

test("handler.getArgumentInputFields", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  // not exist argument
  expect(handler.getArgumentInputFields("null")).toBeNull();
  // sort
  const sort = handler.getArgument("sort")!;
  const fields = handler.getArgumentInputFields(sort)!;
  expect(fields).not.toBeNull();
  const fieldsByStr = handler.getArgumentInputFields("sort");
  expect(fieldsByStr).not.toBeNull();
  expect(fields).toEqual(fieldsByStr);
  // sort.by
  expect(fields.by.name).toEqual("by");
  expect(fields.by.type.toString()).toEqual("Sortable");
  expect(fields.by.type instanceof GraphQLEnumType).toBeTruthy();
  // sort.desc
  expect(fields.desc.name).toEqual("desc");
  expect(fields.desc.type instanceof GraphQLScalarType).toBeTruthy();
  expect((fields.desc.type as GraphQLScalarType).name).toEqual("Boolean");
});

test("handler.getArgumentInputField", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  // not exist argument
  expect(handler.getArgumentInputField("null")).toBeNull();
  expect(handler.getArgumentInputField("sort.null")).toBeNull();
  expect(handler.getArgumentInputField("filter.user.null")).toBeNull();
  // limit
  const limit = handler.getArgumentInputField("limit")!;
  expect(limit).not.toBeNull();
  expect(limit.name).toEqual("limit");
  expect(limit.type instanceof GraphQLNonNull).toBeTruthy();
  // sort.by
  const sortBy = handler.getArgumentInputField("sort.by")!;
  expect(sortBy).not.toBeNull();
  expect(sortBy.name).toEqual("by");
  expect(sortBy.type instanceof GraphQLEnumType).toBeTruthy();
  const sortByValues = (sortBy.type as GraphQLEnumType).getValues();
  expect(sortByValues.map((v) => v.name)).toEqual(["id", "name", "createdAt"]);
  // sort.desc
  const sortDesc = handler.getArgumentInputField("sort.desc")!;
  expect(sortDesc).not.toBeNull();
  expect(sortDesc.name).toEqual("desc");
  expect(sortDesc.type instanceof GraphQLScalarType).toBeTruthy();
  // filter.user.username
  const username = handler.getArgumentInputField("filter.user.username")!;
  expect(username).not.toBeNull();
  expect(username.name).toEqual("username");
  expect(username.type instanceof GraphQLScalarType).toBeTruthy();
});

test("handler.validateInputValue", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  // limit
  const limit = handler.getArgumentInputField("limit")!;
  expect(handler.validateInputValue(10, limit.type)).toBeNull();
  expect(handler.validateInputValue("test", limit.type)).not.toBeNull();
  expect(handler.validateInputValue(true, limit.type)).not.toBeNull();
  // sort.by
  const sortBy = handler.getArgumentInputField("sort.by")!;
  expect(handler.validateInputValue("id", sortBy.type)).toBeNull();
  expect(
    handler.validateInputValue("not-enum-value", sortBy.type)
  ).not.toBeNull();
  expect(handler.validateInputValue(33, sortBy.type)).not.toBeNull();
  // filter.user.username
  const username = handler.getArgumentInputField("filter.user.username")!;
  expect(handler.validateInputValue("test", username.type)).toBeNull();
  expect(handler.validateInputValue(3.14, username.type)).not.toBeNull();
});

test("handler.validateArgument", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  // limit
  expect(handler.validateArgument("limit", 10)).toBeNull();
  expect(handler.validateArgument("limit", "test")).not.toBeNull();
  expect(handler.validateArgument("limit", true)).not.toBeNull();
  // sort.by
  expect(handler.validateArgument("sort.by", "id")).toBeNull();
  expect(handler.validateArgument("sort.by", "not-enum-value")).not.toBeNull();
  expect(handler.validateArgument("sort.by", 33)).not.toBeNull();
  // filter.user.username
  expect(handler.validateArgument("filter.user.username", "test")).toBeNull();
  expect(handler.validateArgument("filter.user.username", 3.14)).not.toBeNull();
});

test("handler.convertArgumentValue", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  // limit
  const limitValueInfo = handler.convertArgumentValue("limit", "10")!;
  expect(limitValueInfo.value).toEqual(10);
  expect(limitValueInfo.type.graphQLType.name).toEqual("Int");
  expect(limitValueInfo.type.isNonNull).toEqual(true);
  expect(limitValueInfo.type.isNonNullList).toEqual(false);
  expect(limitValueInfo.type.isList).toEqual(false);
  expect(limitValueInfo.parentType).toBeNull();
  expect(handler.convertArgumentValue("limit", "3.14")!.value).toEqual(3);
  expect(handler.convertArgumentValue("limit", "true")!.value).toEqual(NaN);
  expect(handler.convertArgumentValue("limit", "test")!.value).toEqual(NaN);
  // sort.by
  const sortByInfo = handler.convertArgumentValue("sort.by", "id")!;
  expect(sortByInfo.value).toEqual("id");
  expect(sortByInfo.type.graphQLType.name).toEqual("Sortable");
  expect(sortByInfo.type.isNonNull).toEqual(false);
  expect(sortByInfo.type.isNonNullList).toEqual(false);
  expect(sortByInfo.type.isList).toEqual(false);
  expect(sortByInfo.parentType!.graphQLType.name).toEqual("SortInput");
  expect(handler.convertArgumentValue("sort.by", "createdAt")!.value).toEqual(
    "createdAt"
  );
  expect(handler.convertArgumentValue("sort.by", "not_enum")!.value).toEqual(
    "not_enum"
  );
  // sort.desc
  const sortDescInfo = handler.convertArgumentValue("sort.desc", "true")!;
  expect(sortDescInfo.value).toEqual(true);
  expect(sortDescInfo.type.graphQLType.name).toEqual("Boolean");
  expect(sortDescInfo.type.isNonNull).toEqual(false);
  expect(sortDescInfo.type.isNonNullList).toEqual(false);
  expect(sortDescInfo.type.isList).toEqual(false);
  expect(sortDescInfo.parentType!.graphQLType.name).toEqual("SortInput");
  expect(handler.convertArgumentValue("sort.desc", "false")!.value).toEqual(
    false
  );
  expect(handler.convertArgumentValue("sort.desc", "0")!.value).toEqual(null);
  expect(handler.convertArgumentValue("sort.desc", "1")!.value).toEqual(null);
  // filter.no
  const filterNoInfo = handler.convertArgumentValue("filter.no", "5")!;
  expect(filterNoInfo.value).toEqual(5);
  expect(filterNoInfo.type.graphQLType.name).toEqual("Int");
  expect(filterNoInfo.type.isNonNull).toEqual(false);
  expect(filterNoInfo.type.isNonNullList).toEqual(false);
  expect(filterNoInfo.type.isList).toEqual(false);
  expect(filterNoInfo.parentType!.graphQLType.name).toEqual("FilterInput");
  expect(handler.convertArgumentValue("filter.no", "test")!.value).toEqual(NaN);
  // filter.nums
  const filterNums = handler.convertArgumentValue("filter.nums", "3")!;
  expect(filterNums.value).toEqual([3]);
  expect(filterNums.type.graphQLType.name).toEqual("Int");
  expect(filterNums.type.isNonNull).toEqual(true);
  expect(filterNums.type.isNonNullList).toEqual(true);
  expect(filterNums.type.isList).toEqual(true);
  expect(filterNums.parentType!.graphQLType.name).toEqual("FilterInput");
  expect(
    handler.convertArgumentValue("filter.nums", "3, 11, -5")!.value
  ).toEqual([3, 11, -5]);
  expect(handler.convertArgumentValue("filter.nums", "test")!.value).toEqual([
    NaN,
  ]);
  expect(handler.convertArgumentValue("filter.nums", "3.14")!.value).toEqual([
    3,
  ]);
  // filter.score
  const filterScoreInfo = handler.convertArgumentValue("filter.score", "3")!;
  expect(filterScoreInfo.value).toEqual(3);
  expect(filterScoreInfo.type.graphQLType.name).toEqual("Float");
  expect(filterScoreInfo.type.isNonNull).toEqual(true);
  expect(filterScoreInfo.type.isNonNullList).toEqual(false);
  expect(filterScoreInfo.type.isList).toEqual(false);
  expect(handler.convertArgumentValue("filter.score", "3.14")!.value).toEqual(
    3.14
  );
  expect(handler.convertArgumentValue("filter.score", "-55.83")!.value).toEqual(
    -55.83
  );
  expect(handler.convertArgumentValue("filter.score", "test")!.value).toEqual(
    NaN
  );
  // filter.id
  const filterIdInfo = handler.convertArgumentValue("filter.id", "test")!;
  expect(filterIdInfo.value).toEqual("test");
  expect(filterIdInfo.type.graphQLType.name).toEqual("ID");
  expect(filterIdInfo.type.isNonNull).toEqual(false);
  expect(filterIdInfo.type.isNonNullList).toEqual(false);
  expect(filterIdInfo.type.isList).toEqual(false);
  expect(handler.convertArgumentValue("filter.id", "3.14")!.value).toEqual(
    "3.14"
  );
  // filter.userId
  const filterUserIdInfo = handler.convertArgumentValue(
    "filter.userId",
    "test"
  )!;
  expect(filterUserIdInfo.value).toEqual("test");
  expect(filterUserIdInfo.type.graphQLType.name).toEqual("ID");
  expect(filterUserIdInfo.type.isNonNull).toEqual(true);
  expect(filterUserIdInfo.type.isNonNullList).toEqual(false);
  expect(filterUserIdInfo.type.isList).toEqual(false);
  expect(handler.convertArgumentValue("filter.userId", "555")!.value).toEqual(
    "555"
  );
  // filter.ids
  const filterIdsInfo = handler.convertArgumentValue("filter.ids", "test")!;
  expect(filterIdsInfo.value).toEqual(["test"]);
  expect(filterIdsInfo.type.graphQLType.name).toEqual("ID");
  expect(filterIdsInfo.type.isNonNull).toEqual(true);
  expect(filterIdsInfo.type.isNonNullList).toEqual(false);
  expect(filterIdsInfo.type.isList).toEqual(true);
  expect(handler.convertArgumentValue("filter.ids", "id1, id2")!.value).toEqual(
    ["id1", "id2"]
  );
  expect(
    handler.convertArgumentValue("filter.ids", "1, -2.0, 3.14")!.value
  ).toEqual(["1", "-2.0", "3.14"]);
  // filter.date
  const filterDateInfo = handler.convertArgumentValue(
    "filter.date",
    "2021-06-21T02:14:43Z"
  )!;
  expect(filterDateInfo.value).toEqual("2021-06-21T02:14:43Z");
  expect(filterDateInfo.type.graphQLType.name).toEqual("DateTime");
  expect(filterDateInfo.type.isNonNull).toEqual(true);
  expect(filterDateInfo.type.isNonNullList).toEqual(false);
  expect(filterDateInfo.type.isList).toEqual(false);
  // filter.user.username
  const filterUserUsernameInfo = handler.convertArgumentValue(
    "filter.user.username",
    "test"
  )!;
  expect(filterUserUsernameInfo.value).toEqual("test");
  expect(filterUserUsernameInfo.type.graphQLType.name).toEqual("String");
  expect(filterUserUsernameInfo.type.isNonNull).toEqual(false);
  expect(filterUserUsernameInfo.type.isNonNullList).toEqual(false);
  expect(filterUserUsernameInfo.type.isList).toEqual(false);
  expect(filterUserUsernameInfo.parentType!.graphQLType.name).toEqual(
    "UserInput"
  );
  const ids4Info = handler.convertArgumentValue("ids4", "1, 2, 3")!;
  expect(ids4Info.value).toEqual([1, 2, 3]);
  expect(ids4Info.type.graphQLType.name).toEqual("Int");
  expect(ids4Info.type.isNonNull).toEqual(true);
  expect(ids4Info.type.isNonNullList).toEqual(true);
  expect(ids4Info.type.isList).toEqual(true);
  expect(ids4Info.parentType).toBeNull();
});

test("handler.getFieldNames", async () => {
  const node1 = tree1.getNodeAsRoot("query.myquery")!;
  const handler1 = new SchemaNodeHandler(node1);
  expect(handler1.getFieldNames()).toEqual(["total", "data"]);
  const node2 = tree1.getNodeAsRoot("query.myquery.data")!;
  const handler2 = new SchemaNodeHandler(node2);
  expect(handler2.getFieldNames()).toEqual([
    "id",
    "name",
    "num",
    "companies",
    "user",
    "createdAt",
  ]);
});

test("handler.getFields", async () => {
  const node = tree1.getNodeAsRoot("query.myquery.data")!;
  const handler = new SchemaNodeHandler(node);
  const fields = handler.getFields();
  expect(fields.length).toEqual(6);
  expect(fields[0].__info.name).toEqual("id");
  expect(fields[1].__info.parentName).toEqual("data");
  expect(fields[2].__info.parentPath).toEqual("data");
  expect(fields[3].__info.path).toEqual("data.companies");
  expect(fields[4].__info.depth).toEqual(1);
  expect(fields[5].__info.isMaxDepth).toEqual(false);
});

test("handler.isHiddenNode", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  const total = handler.getNode("myquery.total")!;
  const data = handler.getNode("myquery.data")!;
  expect(handler.isHiddenNode(total, { traversing: "depthFirst" })).toBeFalsy();
  expect(
    handler.isHiddenNode(total, {
      traversing: "depthFirst",
      hiddenPaths: ["myquery", "myquery.total"],
    })
  ).toBeTruthy();
  expect(
    handler.isHiddenNode(total, {
      traversing: "depthFirst",
      hiddenPaths: ["myquery.data", "myquery.to", /data./],
    })
  ).toBeFalsy();
  expect(
    handler.isHiddenNode(total, {
      traversing: "breadthFirst",
      hiddenPaths: [/myquery./],
    })
  ).toBeTruthy();
  expect(
    handler.isHiddenNode(data, {
      traversing: "breadthFirst",
      hiddenPaths: [/myquery./],
    })
  ).toBeTruthy();
  expect(
    handler.isHiddenNode(total, {
      traversing: "breadthFirst",
      hiddenPaths: [/myquery.da/],
    })
  ).toBeFalsy();
  expect(
    handler.isHiddenNode(data, {
      traversing: "breadthFirst",
      hiddenPaths: [/.*data.*/],
    })
  ).toBeTruthy();
});

test("handler.traverseNode with all paths", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  const tracingNodes: string[] = [];
  handler.traverseNode(
    (node) => {
      tracingNodes.push(node.__info.path);
    },
    { traversing: "breadthFirst" }
  );
  expect(tracingNodes).toEqual([
    "myquery",
    "myquery.total",
    "myquery.data",
    "myquery.data.id",
    "myquery.data.name",
    "myquery.data.num",
    "myquery.data.companies",
    "myquery.data.user",
    "myquery.data.createdAt",
    "myquery.data.companies.id",
    "myquery.data.companies.name",
    "myquery.data.companies.users",
    "myquery.data.companies.users.id",
    "myquery.data.companies.users.username",
    "myquery.data.companies.users.logined",
    "myquery.data.companies.users.score",
    "myquery.data.companies.users.company",
    "myquery.data.companies.users.createdAt",
    "myquery.data.user.id",
    "myquery.data.user.username",
    "myquery.data.user.logined",
    "myquery.data.user.score",
    "myquery.data.user.company",
    "myquery.data.user.createdAt",
    "myquery.data.user.company.id",
    "myquery.data.user.company.name",
    "myquery.data.user.company.users",
  ]);
});

test("handler.traverseNode with hidden paths", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  const tracingNodes: string[] = [];
  handler.traverseNode(
    (node) => {
      tracingNodes.push(node.__info.path);
    },
    {
      traversing: "breadthFirst",
      hiddenPaths: [
        /.*total$/,
        "myquery.data.id",
        /myquery\.data\.user\.company.?/,
        "myquery.data.user.username",
        /myquery\.data\.companies.*rs/,
      ],
    }
  );
  expect(tracingNodes).toEqual([
    "myquery",
    "myquery.data",
    "myquery.data.name",
    "myquery.data.num",
    "myquery.data.companies",
    "myquery.data.user",
    "myquery.data.createdAt",
    "myquery.data.companies.id",
    "myquery.data.companies.name",
    "myquery.data.user.id",
    "myquery.data.user.logined",
    "myquery.data.user.score",
    "myquery.data.user.createdAt",
  ]);
});

test("handler.traverseNode excluding root", async () => {
  const node = tree1.getNodeAsRoot("query.myquery.data")!;
  const handler = new SchemaNodeHandler(node);
  const tracingNodes: SchemaNode[] = [];
  handler.traverseNode(
    (node) => {
      tracingNodes.push(node);
    },
    { traversing: "breadthFirst", excludeRoot: true }
  );
  expect(
    tracingNodes.map((node) => ({
      path: node.__info.path,
      parentPath: node.__info.parentPath,
      depth: node.__info.depth,
    }))
  ).toEqual([
    {
      path: "id",
      parentPath: "",
      depth: 0,
    },
    {
      path: "name",
      parentPath: "",
      depth: 0,
    },
    {
      path: "num",
      parentPath: "",
      depth: 0,
    },
    {
      path: "companies",
      parentPath: "",
      depth: 0,
    },
    {
      path: "user",
      parentPath: "",
      depth: 0,
    },
    {
      path: "createdAt",
      parentPath: "",
      depth: 0,
    },
    {
      path: "companies.id",
      parentPath: "companies",
      depth: 1,
    },
    {
      path: "companies.name",
      parentPath: "companies",
      depth: 1,
    },
    {
      path: "companies.users",
      parentPath: "companies",
      depth: 1,
    },
    {
      path: "companies.users.id",
      parentPath: "companies.users",
      depth: 2,
    },
    {
      path: "companies.users.username",
      parentPath: "companies.users",
      depth: 2,
    },
    {
      path: "companies.users.logined",
      parentPath: "companies.users",
      depth: 2,
    },
    {
      path: "companies.users.score",
      parentPath: "companies.users",
      depth: 2,
    },
    {
      path: "companies.users.company",
      parentPath: "companies.users",
      depth: 2,
    },
    {
      path: "companies.users.createdAt",
      parentPath: "companies.users",
      depth: 2,
    },
    {
      path: "user.id",
      parentPath: "user",
      depth: 1,
    },
    {
      path: "user.username",
      parentPath: "user",
      depth: 1,
    },
    {
      path: "user.logined",
      parentPath: "user",
      depth: 1,
    },
    {
      path: "user.score",
      parentPath: "user",
      depth: 1,
    },
    {
      path: "user.company",
      parentPath: "user",
      depth: 1,
    },
    {
      path: "user.createdAt",
      parentPath: "user",
      depth: 1,
    },
    {
      path: "user.company.id",
      parentPath: "user.company",
      depth: 2,
    },
    {
      path: "user.company.name",
      parentPath: "user.company",
      depth: 2,
    },
    {
      path: "user.company.users",
      parentPath: "user.company",
      depth: 2,
    },
  ]);
});
