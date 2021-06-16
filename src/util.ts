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

export type FieldType = (string | { [key: string]: FieldType })[];

export function convertDotNotationToFieldType(
  dotNotationProperties: string[]
): FieldType {
  type FieldObject = { [key: string]: FieldObject };
  const obj: FieldObject = {};
  for (const prop of dotNotationProperties) {
    let tmpObj = obj;
    for (const token of prop.split(".")) {
      if (tmpObj[token] === undefined) {
        tmpObj[token] = {};
      }
      tmpObj = tmpObj[token];
    }
  }

  const search = (data: FieldObject): FieldType => {
    return Object.entries(data).map(([key, value]) => {
      if (Object.keys(value as any).length === 0) {
        return key;
      } else {
        return { [key]: search(value) };
      }
    });
  };
  return search(obj);
}
