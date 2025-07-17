# VTS

<hr>

## 📦 VTS — Type-Safe Data Validation in TypeScript
VTS is a lightweight, type-focused validation library written entirely in TypeScript. Its primary goal is to ensure that external or dynamic data matches your code’s expected types, rather than validating the data's internal constraints or business rules.

Instead of asking “Is the length of this string 5?”, VTS asks “Is this value a string at all?” — making it ideal for type guarding, input validation, and safety checks when working with unknown or loosely typed data (e.g., API responses or form inputs).

### 🧰 Key Features
* ✅ Simple validators like isString(), isFunction(), etc.
* 🧠 Strict type guards for maximum safety and reliability.
* 🧱 Composable schema classes for defining structured, reusable validation logic.
* 💡 Built with TypeScript types in mind — works seamlessly with typeof, instanceof, and conditional typing.

<hr>

## 🎨 VTS Editor
The VTS Editor is a graphical tool for building and managing VTS schemas visually. It provides a drag-and-drop interface where developers can create, modify, and connect schema definitions without writing raw code.

With the editor, you can:

* 📄 Define new schema types with fields and inheritance.
* 🔗 Create references between schemas (e.g. nested types or extensions).
* 💾 Export/import schemas as JSON
* 🔍 Get an overview of schema structure and dependencies at a glance.
* ⚙️ Automatically generate TypeScript schema and type files

This is especially useful for large projects, team collaboration, or when sharing schema definitions with non-developers.

### Screenshots
#### Schema in use
<img src="doc/images/screenshot1.png" alt="Screenshot 1" width="450px" />

#### Schema with Extend
<img src="doc/images/screenshot2.png" alt="Screenshot 2" width="450px" />

#### Schema field edit
<img src="doc/images/screenshot_edit1.png" alt="Screenshot Edit 1" width="450px" />

### Install

1. install the vts editor
```bash
npm install --save-dev git+https://github.com/stefanwerfling/vtseditor.git
```

2. create your config ```vtseditor.json``` and add your config:
```json
{
  "schemaPrefix": "Schema",
  "schemaPath": "./schemas/schema.json",
  "createTypes": true,
  "createIndex": true,
  "autoGenerate": true,
  "destinationPath": "./schemas/src",
  "code_comment": true
}
```
3. start the vts editor
```bash
npx vtseditor
```

4. open the vts editor in your browser: http://localhost:5173
5. create your schemas, have fun

### 🛠️ Contributing
Contributions welcome! Feel free to submit issues, suggestions, or pull requests.

