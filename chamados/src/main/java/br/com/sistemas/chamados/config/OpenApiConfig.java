package br.com.sistemas.chamados.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI chamadosOpenApi() {
        return new OpenAPI().info(new Info().title("Sistema de chamados")
                .description("Clientes, categorias, técnicos, chamados e comentários")
                .version("1.0"));
    }
}
