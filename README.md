# Sistema de chamados

## Rotas até a aula 7

| Método | Clientes | Categorias | Técnicos | Retorno |
| --- | --- | --- | --- | --- |
| POST | /clientes | /categorias | /tecnicos | 201 |
| GET | /clientes | /categorias | /tecnicos | 200 |
| GET | /clientes/{id} | /categorias/{id} | /tecnicos/{id} | 200 |
| PUT | /clientes/{id} | /categorias/{id} | /tecnicos/{id} | 200 |
| DELETE | /clientes/{id} | /categorias/{id} | /tecnicos/{id} | 204 |

## Exemplos de teste

Com a aplicação rodando em `http://localhost:8080`, enviar pelo Postman ou Insomnia com Body JSON:

POST `/clientes`

```json
{"nome":"Ana Souza","email":"ana@exemplo.com","telefone":"47999999999"}
```

POST `/categorias`

```json
{"nome":"Rede","descricao":"Problemas de rede"}
```

POST `/tecnicos`

```json
{"nome":"Joao Silva","email":"joao@exemplo.com","perfil":"TECNICO"}
```

Resultado esperado nos três POSTs: 201, com o ID do registro criado.
Para conferir, fazer GET na mesma rota, acrescentando o ID retornado. Esperado: 200 com os dados cadastrados.

Dados inválidos devem retornar 400; ID inexistente, 404; e-mail ou nome de categoria duplicado, 409.
