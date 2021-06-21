import fs from "fs";
import {
  buildClientSchema,
  buildSchema,
  getIntrospectionQuery,
  GraphQLSchema,
} from "graphql";
import fetch, { Response } from "node-fetch";

async function fetchIntrospectionQuery(
  endpoint: string,
  authorization: string = ""
): Promise<Response> {
  const query = getIntrospectionQuery({
    descriptions: false,
    schemaDescription: false,
  });
  const response = await fetch(`${endpoint}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify({ query }),
  });
  if (response.status !== 200) {
    throw new Error(response.statusText);
  }
  return response;
}

type SchemaOption = {
  pathOrEndpoint: string;
  authorization?: string;
  encoding?: BufferEncoding;
};

export async function getSchema(option: SchemaOption): Promise<GraphQLSchema> {
  if (option.pathOrEndpoint.startsWith("http")) {
    const endpoint = option.pathOrEndpoint;
    const response = await fetchIntrospectionQuery(
      endpoint,
      option.authorization
    );
    const json = await response.json();
    if (json.errors !== undefined) {
      throw new Error(json.errors);
    }
    const introspection = json.data;
    return buildClientSchema(introspection, { assumeValid: true });
  }

  const path = option.pathOrEndpoint;
  const encoding = option.encoding ?? "utf8";
  const contents = fs.readFileSync(path, { encoding, flag: "r" });
  return buildSchema(contents, { assumeValid: true });
}
