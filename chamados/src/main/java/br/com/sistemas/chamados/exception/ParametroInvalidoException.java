package br.com.sistemas.chamados.exception;

public class ParametroInvalidoException extends RuntimeException {
    public ParametroInvalidoException(String mensagem) {
        super(mensagem);
    }
}
