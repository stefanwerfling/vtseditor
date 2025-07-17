# VTS & VTS-Editor

<hr>

## 📦 VTS — Type-Safe Data Validation in TypeScript
<p align="center">
<img src="doc/images/vtslogo.png" width="300px" style="border-radius: 15px;transition: transform .2s;object-fit: cover;">
<br><br>
Vts is a data type validation library written entirely in TypeScript. Its main focus lies on validating the types of the
given data (e.g. "is x a string") and not so much on validating the data itself (e.g. "is the length of the string x
equal to y") to ensure that external data is compatible with your own source code.
<br><br>
The package consists of some basic type guarded validator methods like isString() and isFunction() that can be accessed
via the main Vts object. Most of these validators are also encapsulated in schema classes which can be used to create
complex schemas. The main strategy when validating those complex schemas is to be as strict as possible.
</p>

### 🧰 Key Features
* ✅ Simple validators like isString(), isFunction(), etc.
* 🧠 Strict type guards for maximum safety and reliability.
* 🧱 Composable schema classes for defining structured, reusable validation logic.
* 💡 Built with TypeScript types in mind — works seamlessly with typeof, instanceof, and conditional typing.

[Read more by VTS project: https://github.com/OpenSourcePKG/vts](https://github.com/OpenSourcePKG/vts)

<hr>

## 🎨 VTS-Editor
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

# Supported by
Special thanks to the following companys:
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
	<tr>
		<td align="center">
            <a href="https://jb.gg/OpenSourceSupport">
				<img src="https://resources.jetbrains.com/storage/products/company/brand/logos/jb_beam.png" width="80" alt=""/>
				<br /><sub><b>JetBrains</b></sub>
			</a>
        </td>
        <td align="center">
            <a href="https://github.com/OpenSourcePKG">
				<img src="https://raw.githubusercontent.com/OpenSourcePKG/.github/main/profile/pegenaulogo250.png" width="80" alt=""/>
				<br /><sub><b>Pegenau GmbH & Co. KG</b></sub>
			</a>
        </td>
	</tr>
</table>

# Contributors

Special thanks to the following contributors:

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
	<tr>
		<td align="center">
			<a href="https://github.com/Choppel">
				<img src="https://avatars.githubusercontent.com/u/14126324?v=4" width="80" alt=""/>
				<br /><sub><b>Choppel</b></sub>
			</a>
		</td>
	</tr>
</table>
<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
