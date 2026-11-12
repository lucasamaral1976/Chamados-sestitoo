# Sistema de chamados

Projeto em Java 21 com Spring Boot, Maven e banco H2 ou PostgreSQL.

Interface de atendimento: `http://localhost:8080/`.

Para executar, na pasta `chamados`: `.\mvnw.cmd spring-boot:run`.
Para rodar os testes: `.\mvnw.cmd verify`.

## Rotas

- `/clientes`, `/categorias`, `/tecnicos` e `/chamados`: POST e GET; com `/{id}`, GET, PUT e DELETE.
- PATCH `/chamados/{id}/atribuir` e `/chamados/{id}/status`.
- GET `/clientes/{clienteId}/chamados`.
- POST e GET `/chamados/{chamadoId}/comentarios`.

## Exemplo de teste

Com cliente e categoria cadastrados, enviar POST para `http://localhost:8080/chamados`, usando os IDs retornados:

```json
{"titulo":"Sem internet","descricao":"Rede indisponivel","prioridade":"ALTA","clienteId":1,"categoriaId":1}
```

Esperado: 201 e o chamado com status ABERTO.

Exemplo de consulta com filtros e paginação:

```text
GET /chamados?status=ABERTO&prioridade=ALTA&clienteId=1&page=0&size=10&sort=id,desc
```

Documentação da API: `http://localhost:8080/swagger-ui/index.html`.
Para usar PostgreSQL, ativar o profile `postgres` e configurar `DB_URL`, `DB_USERNAME` e `DB_PASSWORD`.
