# Testes das aulas 8 a 12

Execução em 10/11/2026, com Java 21 e Spring Boot 4.1.1.

| Aula | Entrega conferida |
| --- | --- |
| 8 | CRUD de Chamado, enums e relacionamentos com Cliente, Categoria e Técnico |
| 9 | Atribuição, mudança de status, data de fechamento e bloqueio de alterações após fechar |
| 10 | Filtros combinados, paginação, ordenação, chamados do cliente e comentários |
| 11 | Testes com DataJpaTest e WebMvcTest, além do fluxo integrado |
| 12 | OpenAPI, Swagger UI e profile PostgreSQL |

## Resultados

- `.\mvnw.cmd verify`: BUILD SUCCESS; 54 testes, sem falhas, erros ou testes ignorados.
- 83 requisições de verificação aprovadas com H2 e as mesmas 83 com PostgreSQL 17.8.
- As 80 verificações dos cadastros de clientes, categorias e técnicos também passaram.
- POST 201, consultas e atualizações 200, DELETE 204 e erros 400, 404 e 409 conferidos.
- Relacionamentos e comentários confirmados por SQL no H2 Console e no PostgreSQL.
- Após reiniciar a aplicação com PostgreSQL, o chamado fechado, suas datas, vínculos e dois comentários continuaram disponíveis.
- H2 reiniciou sem os dados de teste; o console H2 ficou desabilitado no profile PostgreSQL.
- Swagger UI e `/v3/api-docs` responderam nos dois profiles, incluindo os códigos 201 e 204 documentados.

Os testes cobrem criação com status ABERTO e data automática, validação dos campos, IDs relacionados inexistentes, atribuição e troca de técnico, filtros em conjunto, paginação e ordenação, comentários, fechamento e tentativas de alterar chamado fechado. Também verificam duplicidades dos cadastros e proteção das chaves estrangeiras.

O teste do PostgreSQL usou uma instância local separada na porta 55432. O profile do projeto aceita a conexão definida pelas variáveis DB_URL, DB_USERNAME e DB_PASSWORD, conforme os exemplos do README.
