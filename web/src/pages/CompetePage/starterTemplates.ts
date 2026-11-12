export const DEFAULT_CODE = '// Write your solution here\n';

export type Scaffold = {
  visible: string;
  compose: (userCode: string) => string;
  extract: (fullCode: string) => string;
};

const ensureTrailingNewline = (text: string) => (text && !text.endsWith('\n') ? `${text}\n` : text);

const stripTrailingWhitespace = (text: string) => text.replace(/\s+$/, '');

const buildScaffold = (prelude: string, visible: string, postlude: string): Scaffold => {
  const prefix = ensureTrailingNewline(prelude);
  const suffix = ensureTrailingNewline(postlude);

  return {
    visible,
    compose: (userCode) =>
      `${prefix}${stripTrailingWhitespace(userCode)}\n${suffix}`,
    extract: (fullCode) => {
      const normalized = fullCode.replace(/\r\n/g, '\n');

      if (normalized.startsWith(prefix) && normalized.endsWith(suffix)) {
        return `${stripTrailingWhitespace(normalized.slice(prefix.length, normalized.length - suffix.length))}\n`;
      }

      return fullCode;
    },
  };
};

const buildPython = (parameters: string[]): Scaffold => {
  const signature = parameters.join(', ');
  const args = parameters.map((name) => `data["${name}"]`).join(', ');

  if (parameters.length === 0) {
    return buildScaffold(
      'import sys\nimport json\n\n',
      'def solve(data):\n    # Write your solution here\n    return None\n',
      '\nif __name__ == "__main__":\n    data = json.loads(sys.stdin.readline())\n    print(json.dumps(solve(data)))\n',
    );
  }

  return buildScaffold(
    'import sys\nimport json\n\n',
    `def solve(${signature}):\n    # Write your solution here\n    return None\n`,
    `\nif __name__ == "__main__":\n    data = json.loads(sys.stdin.readline())\n    print(json.dumps(solve(${args})))\n`,
  );
};

const buildNode = (parameters: string[]): Scaffold => {
  const signature = parameters.join(', ');
  const args = parameters.map((name) => `data.${name}`).join(', ');

  if (parameters.length === 0) {
    return buildScaffold(
      "const readline = require('readline');\n\n",
      'function solve(data) {\n  // Write your solution here\n  return null;\n}\n',
      "\nconst rl = readline.createInterface({ input: process.stdin });\n\nrl.on('line', (line) => {\n  console.log(JSON.stringify(solve(JSON.parse(line))));\n  rl.close();\n});\n",
    );
  }

  return buildScaffold(
    "const readline = require('readline');\n\n",
    `function solve(${signature}) {\n  // Write your solution here\n  return null;\n}\n`,
    `\nconst rl = readline.createInterface({ input: process.stdin });\n\nrl.on('line', (line) => {\n  const data = JSON.parse(line);\n  console.log(JSON.stringify(solve(${args})));\n  rl.close();\n});\n`,
  );
};

const buildCsharp = (parameters: string[]): Scaffold => {
  const methodParameters = parameters.length > 0
    ? parameters.map((name) => `JsonElement ${name}`).join(', ')
    : 'JsonElement data';
  const callArguments = parameters.length > 0
    ? parameters.map((name) => `document.RootElement.GetProperty("${name}")`).join(', ')
    : 'document.RootElement';

  return buildScaffold(
    'using System;\nusing System.Text.Json;\n\nclass Program\n{\n',
    `    static object? Solve(${methodParameters})\n    {\n        // Write your solution here\n        return null;\n    }\n`,
    `\n    static void Main()\n    {\n        var line = Console.ReadLine();\n        if (line is null) return;\n        using var document = JsonDocument.Parse(line);\n        Console.WriteLine(JsonSerializer.Serialize(Solve(${callArguments})));\n    }\n}\n`,
  );
};

const buildJava = (): Scaffold =>
  buildScaffold(
    'import java.io.BufferedReader;\nimport java.io.InputStreamReader;\n\nclass Main {\n',
    '    static String solve(String input) {\n        // Write your solution here\n        return "";\n    }\n',
    '\n    public static void main(String[] args) throws Exception {\n        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));\n        String input = reader.readLine();\n        if (input != null) {\n            System.out.println(solve(input));\n        }\n    }\n}\n',
  );

const CPP_BASE = '#include <bits/stdc++.h>\nusing namespace std;\n\n';

const CPP_SUPPORT_BODY = String.raw`struct Json {
    enum Type { Null, Bool, Number, String, Array, Object } type = Null;
    bool b = false;
    double num = 0;
    string str;
    vector<Json> arr;
    map<string, Json> obj;

    const Json& operator[](const string& key) const {
        static const Json empty;
        auto it = obj.find(key);
        return it == obj.end() ? empty : it->second;
    }
};

class JsonParser {
public:
    explicit JsonParser(const string& text) : text_(text) {}

    Json parse() {
        skipSpace();
        return parseValue();
    }

private:
    const string& text_;
    size_t pos_ = 0;

    void skipSpace() {
        while (pos_ < text_.size() && isspace(static_cast<unsigned char>(text_[pos_]))) pos_++;
    }

    char peek() const {
        return pos_ < text_.size() ? text_[pos_] : '\0';
    }

    Json parseValue() {
        skipSpace();
        char c = peek();
        if (c == '{') return parseObject();
        if (c == '[') return parseArray();
        if (c == '"') return parseString();
        if (c == 't') { pos_ += 4; Json value; value.type = Json::Bool; value.b = true; return value; }
        if (c == 'f') { pos_ += 5; Json value; value.type = Json::Bool; value.b = false; return value; }
        if (c == 'n') { pos_ += 4; return Json(); }
        return parseNumber();
    }

    Json parseObject() {
        Json value;
        value.type = Json::Object;
        pos_++;
        skipSpace();
        if (peek() == '}') { pos_++; return value; }
        while (pos_ < text_.size()) {
            skipSpace();
            Json key = parseString();
            skipSpace();
            if (peek() == ':') pos_++;
            value.obj[key.str] = parseValue();
            skipSpace();
            if (peek() == ',') { pos_++; continue; }
            if (peek() == '}') { pos_++; }
            break;
        }
        return value;
    }

    Json parseArray() {
        Json value;
        value.type = Json::Array;
        pos_++;
        skipSpace();
        if (peek() == ']') { pos_++; return value; }
        while (pos_ < text_.size()) {
            value.arr.push_back(parseValue());
            skipSpace();
            if (peek() == ',') { pos_++; continue; }
            if (peek() == ']') { pos_++; }
            break;
        }
        return value;
    }

    Json parseString() {
        Json value;
        value.type = Json::String;
        pos_++;
        while (pos_ < text_.size() && text_[pos_] != '"') {
            char c = text_[pos_++];
            if (c == '\\' && pos_ < text_.size()) {
                char escaped = text_[pos_++];
                switch (escaped) {
                    case 'n': value.str += '\n'; break;
                    case 't': value.str += '\t'; break;
                    case 'r': value.str += '\r'; break;
                    case 'b': value.str += '\b'; break;
                    case 'f': value.str += '\f'; break;
                    case 'u': {
                        unsigned code = 0;
                        for (int i = 0; i < 4 && pos_ < text_.size(); i++) {
                            char h = text_[pos_++];
                            code = code * 16 + (h <= '9' ? h - '0' : (tolower(h) - 'a' + 10));
                        }
                        value.str += code < 128 ? static_cast<char>(code) : '?';
                        break;
                    }
                    default: value.str += escaped;
                }
            } else {
                value.str += c;
            }
        }
        if (pos_ < text_.size()) pos_++;
        return value;
    }

    Json parseNumber() {
        size_t start = pos_;
        if (peek() == '-') pos_++;
        while (pos_ < text_.size()) {
            char c = text_[pos_];
            if (!isdigit(static_cast<unsigned char>(c)) && c != '.' && c != 'e' && c != 'E' && c != '+' && c != '-') break;
            pos_++;
        }
        string token = text_.substr(start, pos_ - start);
        Json value;
        value.type = Json::Number;
        value.str = token;
        value.num = strtod(token.c_str(), nullptr);
        return value;
    }
};

template <class T> struct JsonReader {
    static T read(const Json& value) { return T(); }
};

template <> struct JsonReader<int> {
    static int read(const Json& value) { return static_cast<int>(value.num); }
};

template <> struct JsonReader<long long> {
    static long long read(const Json& value) { return static_cast<long long>(value.num); }
};

template <> struct JsonReader<double> {
    static double read(const Json& value) { return value.num; }
};

template <> struct JsonReader<bool> {
    static bool read(const Json& value) { return value.b; }
};

template <> struct JsonReader<string> {
    static string read(const Json& value) { return value.str; }
};

template <> struct JsonReader<Json> {
    static Json read(const Json& value) { return value; }
};

template <class T> struct JsonReader<vector<T>> {
    static vector<T> read(const Json& value) {
        vector<T> result;
        result.reserve(value.arr.size());
        for (const Json& item : value.arr) {
            result.push_back(JsonReader<T>::read(item));
        }
        return result;
    }
};

template <class T> struct JsonReader<map<string, T>> {
    static map<string, T> read(const Json& value) {
        map<string, T> result;
        for (const auto& entry : value.obj) {
            result[entry.first] = JsonReader<T>::read(entry.second);
        }
        return result;
    }
};

template <class T> T readJson(const Json& value) {
    return JsonReader<T>::read(value);
}

string jsonDump(const Json& value);
string jsonDump(int value);
string jsonDump(long long value);
string jsonDump(double value);
string jsonDump(bool value);
string jsonDump(const string& value);

string jsonQuote(const string& value) {
    string out = "\"";
    for (char c : value) {
        switch (c) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default: out += c;
        }
    }
    out += '"';
    return out;
}

string jsonDump(int value) { return to_string(value); }
string jsonDump(long long value) { return to_string(value); }
string jsonDump(bool value) { return value ? "true" : "false"; }
string jsonDump(const string& value) { return jsonQuote(value); }

string jsonDump(double value) {
    if (!isfinite(value)) return "null";
    ostringstream out;
    out << setprecision(15) << value;
    string text = out.str();
    if (text.find('.') == string::npos && text.find('e') == string::npos && text.find('E') == string::npos) {
        text += ".0";
    }
    return text;
}

template <class T> string jsonDump(const vector<T>& values) {
    string out = "[";
    for (size_t i = 0; i < values.size(); i++) {
        if (i > 0) out += ", ";
        out += jsonDump(values[i]);
    }
    out += "]";
    return out;
}

template <class T> string jsonDump(const map<string, T>& values) {
    string out = "{";
    bool first = true;
    for (const auto& entry : values) {
        if (!first) out += ", ";
        first = false;
        out += jsonQuote(entry.first) + ": " + jsonDump(entry.second);
    }
    out += "}";
    return out;
}

string jsonDump(const Json& value) {
    switch (value.type) {
        case Json::Null: return "null";
        case Json::Bool: return jsonDump(value.b);
        case Json::Number: return value.str;
        case Json::String: return jsonQuote(value.str);
        case Json::Array: return jsonDump(value.arr);
        case Json::Object: return jsonDump(value.obj);
    }
    return "null";
}
`;

const CPP_SUPPORT = `${CPP_BASE}${CPP_SUPPORT_BODY}`;

const readFirstInputObject = (testCases?: Array<{ input?: string }>): Record<string, unknown> | null => {
  const source = (testCases ?? []).find(
    (testCase) => typeof testCase?.input === 'string' && testCase.input.trim().length > 0,
  );

  if (!source?.input) {
    return null;
  }

  try {
    const parsed = JSON.parse(source.input);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const keys = Object.keys(parsed);

    if (keys.length === 0 || !keys.every((key) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key))) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const inferParameterNames = (testCases?: Array<{ input?: string }>): string[] => {
  const values = readFirstInputObject(testCases);
  return values ? Object.keys(values) : [];
};

const cppTypeOf = (value: unknown): string => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) return 'double';
    return Math.abs(value) <= 2147483647 ? 'int' : 'long long';
  }
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'bool';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'vector<int>';
    const inner = cppTypeOf(value[0]);
    return value.every((item) => cppTypeOf(item) === inner) ? `vector<${inner}>` : 'vector<Json>';
  }
  if (value && typeof value === 'object') return 'map<string, Json>';
  return 'Json';
};

const inferCppAnswer = (testCases?: Array<{ output?: string }>): { type: string; json: boolean } => {
  const source = (testCases ?? []).find(
    (testCase) => typeof testCase?.output === 'string' && testCase.output.trim().length > 0,
  );

  if (!source?.output) {
    return { type: 'string', json: false };
  }

  try {
    return { type: cppTypeOf(JSON.parse(source.output)), json: true };
  } catch {
    return { type: 'string', json: false };
  }
};

const cppPlaceholder = (type: string): string => {
  if (type === 'bool') return 'false';
  if (type === 'int' || type === 'long long') return '0';
  if (type === 'double') return '0.0';
  if (type === 'string') return '""';
  if (type === 'Json') return 'Json()';
  return '{}';
};

const buildCpp = (
  parameters: string[],
  testCases?: Array<{ input?: string; output?: string }>,
): Scaffold => {
  if (parameters.length === 0) {
    return buildScaffold(
      CPP_BASE,
      'string solve(string input) {\n    // Write your solution here\n    return "";\n}\n',
      '\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    stringstream buffer;\n    buffer << cin.rdbuf();\n    cout << solve(buffer.str()) << "\\n";\n    return 0;\n}\n',
    );
  }

  const values = readFirstInputObject(testCases);
  const answer = inferCppAnswer(testCases);
  const parameterTypes = parameters.map((name) => cppTypeOf(values?.[name]));
  const signature = parameters.map((name, index) => `${parameterTypes[index]} ${name}`).join(', ');
  const argumentsList = parameters
    .map((name, index) => `readJson<${parameterTypes[index]}>(root["${name}"])`)
    .join(', ');
  const visible = `${answer.type} solve(${signature}) {\n    // Write your solution here\n    return ${cppPlaceholder(answer.type)};\n}\n`;
  const call = answer.json ? `jsonDump(solve(${argumentsList}))` : `solve(${argumentsList})`;
  const postlude = `\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    stringstream buffer;\n    buffer << cin.rdbuf();\n    Json root = JsonParser(buffer.str()).parse();\n    cout << ${call} << "\\n";\n    return 0;\n}\n`;

  return buildScaffold(CPP_SUPPORT, visible, postlude);
};

export const getScaffold = (
  codeName: string | undefined,
  parameters: string[],
  testCases?: Array<{ input?: string; output?: string }>,
): Scaffold => {
  switch (codeName) {
    case 'python':
      return buildPython(parameters);
    case 'nodejs':
    case 'javascript':
      return buildNode(parameters);
    case 'csharp':
      return buildCsharp(parameters);
    case 'java':
      return buildJava();
    case 'cpp':
      return buildCpp(parameters, testCases);
    default:
      return buildScaffold('', DEFAULT_CODE, '');
  }
};
