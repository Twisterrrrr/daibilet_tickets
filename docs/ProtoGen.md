# Генерация TypeScript из .proto (tc-simple)

Proto-файлы: `packages/backend/proto/tc-simple/`

Для генерации типов установите `ts-proto` и `grpc-tools`:

```bash
cd packages/backend && pnpm add -D ts-proto
```

Команда (из корня монорепо):

```bash
cd packages/backend
npx protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=src/generated \
  --proto_path=proto/tc-simple \
  proto/tc-simple/*.proto
```

Выход: `packages/backend/src/generated/`. Добавьте в `.gitignore` или коммитьте — на усмотрение команды.
