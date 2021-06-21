import { query as gqlQuery } from "gql-query-builder";
import { GraphQLSchema } from "graphql";
import path from "path";
import {
  convertArgumentValueToVariables,
  convertDotNotationToFields,
} from "../examples/queryBuilder";
import { GraphQLSchemaTree } from "../src/graphqlSchemaTree";
import { SchemaNodeHandler } from "../src/handler";
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

test("convert dot notation properties to fields for gql-query-builder", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  const hiddenPaths = [
    /.*total$/,
    "myquery.data.id",
    /myquery\.data\.user\.company.?/,
    "myquery.data.user.username",
    "myquery.data.companies.users.logined",
    "myquery.data.companies.users.company",
  ];
  const depthFirstTracing: string[] = [];
  handler.traverseNode(
    (node) => {
      depthFirstTracing.push(node.__info.path);
    },
    {
      traversing: "depthFirst",
      hiddenPaths,
    }
  );
  expect(depthFirstTracing).toEqual([
    "myquery",
    "myquery.data",
    "myquery.data.name",
    "myquery.data.num",
    "myquery.data.companies",
    "myquery.data.companies.id",
    "myquery.data.companies.name",
    "myquery.data.companies.users",
    "myquery.data.companies.users.id",
    "myquery.data.companies.users.username",
    "myquery.data.companies.users.score",
    "myquery.data.companies.users.createdAt",
    "myquery.data.user",
    "myquery.data.user.id",
    "myquery.data.user.logined",
    "myquery.data.user.score",
    "myquery.data.user.createdAt",
    "myquery.data.createdAt",
  ]);
  const depthFirstFields = convertDotNotationToFields(depthFirstTracing);
  const expectedFields = [
    {
      myquery: [
        {
          data: [
            "name",
            "num",
            {
              companies: [
                "id",
                "name",
                {
                  users: ["id", "username", "score", "createdAt"],
                },
              ],
            },
            {
              user: ["id", "logined", "score", "createdAt"],
            },
            "createdAt",
          ],
        },
      ],
    },
  ];
  expect(depthFirstFields).toEqual(expectedFields);

  const breadthFirstTracing: string[] = [];
  handler.traverseNode(
    (node) => {
      breadthFirstTracing.push(node.__info.path);
    },
    {
      traversing: "breadthFirst",
      hiddenPaths,
    }
  );
  expect(breadthFirstTracing).toEqual([
    "myquery",
    "myquery.data",
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
    "myquery.data.companies.users.score",
    "myquery.data.companies.users.createdAt",
    "myquery.data.user.id",
    "myquery.data.user.logined",
    "myquery.data.user.score",
    "myquery.data.user.createdAt",
  ]);
  const breadFirstFields = convertDotNotationToFields(breadthFirstTracing);
  expect(breadFirstFields).toEqual(expectedFields);
});

test("convert limit argument to variables for gql-query-builder", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  const name = "limit";
  const variables = convertArgumentValueToVariables(
    name,
    handler.convertArgumentValue(name, "10")!
  );
  expect(variables).toEqual({
    [name]: {
      list: false,
      required: true,
      type: "Int",
      value: 10,
    },
  });
  expect(
    gqlQuery({
      operation: "myquery",
      variables: variables,
    }).query
  ).toEqual(`query ($${name}: Int!) { myquery (${name}: $${name})  }`);
});

test("convert offset argument to variables for gql-query-builder", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  const name = "offset";
  const variables = convertArgumentValueToVariables(
    name,
    handler.convertArgumentValue(name, "500")!
  );
  expect(variables).toEqual({
    [name]: {
      list: false,
      required: false,
      type: "Int",
      value: 500,
    },
  });
  expect(
    gqlQuery({
      operation: "myquery",
      variables: variables,
    }).query
  ).toEqual(`query ($${name}: Int) { myquery (${name}: $${name})  }`);
});

test("convert ids? argument to variables for gql-query-builder", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  // ids1
  const ids1 = "ids1";
  const ids1Variable = convertArgumentValueToVariables(
    ids1,
    handler.convertArgumentValue(ids1, "1")!
  );
  expect(ids1Variable).toEqual({
    [ids1]: {
      list: true,
      required: false,
      type: "Int",
      value: [1],
    },
  });
  expect(
    gqlQuery({
      operation: "myquery",
      variables: ids1Variable,
    }).query
  ).toEqual("query ($ids1: [Int]) { myquery (ids1: $ids1)  }");
  // ids2
  const ids2 = "ids2";
  const ids2Variable = convertArgumentValueToVariables(
    ids2,
    handler.convertArgumentValue(ids2, "2")!
  );
  expect(ids2Variable).toEqual({
    [ids2]: {
      list: [true],
      required: false,
      type: "Int",
      value: [2],
    },
  });
  expect(
    gqlQuery({
      operation: "myquery",
      variables: ids2Variable,
    }).query
  ).toEqual("query ($ids2: [Int!]) { myquery (ids2: $ids2)  }");
  // ids3
  const ids3 = "ids3";
  const ids3Variable = convertArgumentValueToVariables(
    ids3,
    handler.convertArgumentValue(ids3, "3")!
  );
  expect(ids3Variable).toEqual({
    [ids3]: {
      list: true,
      required: true,
      type: "Int",
      value: [3],
    },
  });
  expect(
    gqlQuery({
      operation: "myquery",
      variables: ids3Variable,
    }).query
  ).toEqual("query ($ids3: [Int]!) { myquery (ids3: $ids3)  }");
  // ids4
  const ids4 = "ids4";
  const ids4Variable = convertArgumentValueToVariables(
    ids4,
    handler.convertArgumentValue(ids4, "4")!
  );
  expect(ids4Variable).toEqual({
    [ids4]: {
      list: [true],
      required: true,
      type: "Int",
      value: [4],
    },
  });
  expect(
    gqlQuery({
      operation: "myquery",
      variables: ids4Variable,
    }).query
  ).toEqual("query ($ids4: [Int!]!) { myquery (ids4: $ids4)  }");
});

test("convert sort argument to variables for gql-query-builder", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  const sortBy = "sort.by";
  const sortValue = convertArgumentValueToVariables(
    sortBy,
    handler.convertArgumentValue(sortBy, "name")!
  ) as any;
  expect(sortValue).toEqual({
    sort: {
      required: false,
      type: "SortInput",
      value: {
        by: "name",
      },
    },
  });
  const expectedQuery = "query ($sort: SortInput) { myquery (sort: $sort)  }";
  const q1 = gqlQuery({
    operation: "myquery",
    variables: sortValue,
  });
  expect(q1.query).toEqual(expectedQuery);
  expect(q1.variables).toEqual({ sort: { by: "name" } });
  // sort.desc
  const sortDesc = "sort.desc";
  const sortDescValue = convertArgumentValueToVariables(
    sortDesc,
    handler.convertArgumentValue(sortDesc, "false")!
  ) as any;
  Object.assign(sortValue.sort.value, sortDescValue.sort.value);
  // merged query
  const q2 = gqlQuery({
    operation: "myquery",
    variables: sortValue,
  });
  expect(q2.query).toEqual(expectedQuery);
  expect(q2.variables).toEqual({ sort: { by: "name", desc: false } });
});

test("convert filter argument to variables for gql-query-builder", async () => {
  const node = tree1.getNodeAsRoot("query.myquery")!;
  const handler = new SchemaNodeHandler(node);
  const filterUserId = "filter.userId";
  const filterValue = convertArgumentValueToVariables(
    filterUserId,
    handler.convertArgumentValue(filterUserId, "test-id")!
  ) as any;
  expect(filterValue).toEqual({
    filter: {
      required: false,
      type: "FilterInput",
      value: {
        userId: "test-id",
      },
    },
  });
  const expectedQuery =
    "query ($filter: FilterInput) { myquery (filter: $filter)  }";
  const q1 = gqlQuery({
    operation: "myquery",
    variables: filterValue,
  });
  expect(q1.query).toEqual(expectedQuery);
  expect(q1.variables).toEqual({ filter: { userId: "test-id" } });
  // filter.date
  const filterDate = "filter.date";
  const filterDateValue = convertArgumentValueToVariables(
    filterDate,
    handler.convertArgumentValue(filterDate, "2021-06-21T02:14:43Z")!
  ) as any;
  Object.assign(filterValue.filter.value, filterDateValue.filter.value);
  // filter.nums
  const filterNums = "filter.nums";
  const filterNumsValue = convertArgumentValueToVariables(
    filterNums,
    handler.convertArgumentValue(filterNums, "1, 2, 3")!
  ) as any;
  Object.assign(filterValue.filter.value, filterNumsValue.filter.value);
  // merged query
  const q2 = gqlQuery({
    operation: "myquery",
    variables: filterValue,
  });
  expect(q2.query).toEqual(expectedQuery);
  expect(q2.variables).toEqual({
    filter: {
      date: "2021-06-21T02:14:43Z",
      nums: [1, 2, 3],
      userId: "test-id",
    },
  });
});
