import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [FormsModule], // Necesario para usar [(ngModel)] en los inputs
    templateUrl: './login.html',
    styleUrls: ['./login.css']
})

export class Login {
    private authService = inject(AuthService);
    private router = inject(Router);
    private supabaseService = inject(SupabaseService);

    // Variables para el formulario
    email = '';
    password = '';

    // Signals para manejar la interfaz
    isLoading = signal(false);
    errorMessage = signal('');

    async iniciarSesion() {
        this.isLoading.set(true);
        this.errorMessage.set('');

        try {
            const { data, error } = await this.authService.loginConEmail(this.email, this.password);

            if (error) throw error;
            // Si salió bien, lo mandamos al panel o a la cartelera según prefieras
            this.router.navigate(['/']);

        } catch (error: any) {
            console.error("Error exacto de Supabase:", error); // <-- Agregá esto para depurar
            // Si el usuario no existe o la clave está mal
            this.errorMessage.set('Correo o contraseña incorrectos.');
        } finally {
            this.isLoading.set(false);
        }
    }


    async loginConGithub() {
        this.isLoading.set(true);
        try {
            const { error } = await this.supabaseService.supabase.auth.signInWithOAuth({
                provider: 'github',
            });
            if (error) throw error;
            // No hace falta redirigir acá, OAuth recarga la página
        } catch (error: any) {
            console.error("Error con GitHub:", error);
            this.errorMessage.set('Error al conectar con GitHub.');
            this.isLoading.set(false);
        }
    }

}