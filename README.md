# VTS Editor
## Install

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
  "autoGenerate": true,
  "destinationPath": "./schemas/src"
}
```
3. start the vts editor
```bash
npx vtseditor
```

4. open the vts editor in your browser: http://localhost:5173
5. create your schemas, have fun

## Screenshot
<img src="doc/images/screenshot1.png" alt="Screenshot 1" width="450px" />