package br.com.sistemas.chamados.dto;

import br.com.sistemas.chamados.entity.Cliente;

public record ClienteResponse(Long id, String nome, String email, String telefone) {
    public static ClienteResponse de(Cliente entidade) {
        return new ClienteResponse(entidade.getId(), entidade.getNome(), entidade.getEmail(), entidade.getTelefone());
    }
}
