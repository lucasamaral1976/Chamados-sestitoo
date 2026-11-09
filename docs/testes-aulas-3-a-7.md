# Testes das aulas 3 a 7

Testes executados em 09/11/2026, com a aplicação na porta 8080 e banco H2.

Compilação: `.\mvnw.cmd verify` passou, com 1 teste de inicialização sem falhas.

As rotas `/clientes`, `/categorias` e `/tecnicos` foram testadas:

| Operação | Retorno conferido |
| --- | --- |
| Criar | 201 e Location com o ID |
| Listar e buscar por ID | 200 |
| Atualizar | 200 e alteração salva no banco |
| Excluir | 204, seguido de 404 ao consultar |
| Dados inválidos | 400 |
| ID inexistente | 404 |
| E-mail ou nome de categoria duplicado | 409 |

Foram 80 verificações HTTP aprovadas. Os registros criados para os testes foram removidos ao final.

Também foram conferidos os perfis ADMIN e TECNICO, os limites dos campos e a atualização mantendo o próprio e-mail ou nome de categoria.

No H2 Console, as consultas `SELECT * FROM CLIENTES`, `SELECT * FROM CATEGORIAS` e `SELECT * FROM TECNICOS` confirmaram os dados cadastrados pela API.
