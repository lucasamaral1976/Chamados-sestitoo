package br.com.sistemas.chamados.exception;

public class ChamadoFechadoException extends RegraNegocioException {
    public ChamadoFechadoException(Long id) {
        super("Chamado " + id + " está fechado e não pode ser alterado");
    }
}
