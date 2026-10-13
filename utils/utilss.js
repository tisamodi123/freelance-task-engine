const parseJSONFields = (body, fields = []) => {
  fields.forEach((field) => {
    const value = body[field];

    // Skip if field not provided or empty
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === "undefined" ||
      value === "null"
    ) {
      delete body[field]; // clean it up
      return;
    }

    // Parse if it's a valid JSON string
    if (typeof value === "string") {
      try {
        body[field] = JSON.parse(value);
      } catch (e) {
        throw new Error(`${field} must be a valid JSON object string`);
      }
    }
  });

  return body;
};

module.exports = { parseJSONFields };