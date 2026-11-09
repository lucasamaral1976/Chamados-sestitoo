package br.com.sistemas.chamados.dto;

import br.com.sistemas.chamados.entity.Tecnico;
import br.com.sistemas.chamados.entity.Perfil;

public record TecnicoResponse(Long id, String nome, String email, Perfil perfil) {
    public static TecnicoResponse de(Tecnico entidade) {
        return new TecnicoResponse(entidade.getId(), entidade.getNome(), entidade.getEmail(), entidade.getPerfil());
    }
}
