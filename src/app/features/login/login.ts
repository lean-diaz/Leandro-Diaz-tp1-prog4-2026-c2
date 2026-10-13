import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './login.html',
    styleUrls: ['./login.css']
})

export class Login {
    private authService = inject(AuthService);
    private router = inject(Router);
    private supabaseService = inject(SupabaseService);

    // variables para el formulario
    email = '';
    password = '';

    // signals para manejar la interfaz
    isLoading = signal(false);
    errorMessage = signal('');

    async iniciarSesion() {
        this.isLoading.set(true);
        this.errorMessage.set('');
        try {
            const { data, error } = await this.authService.loginConEmail(this.email, this.password);
            if (error) throw error;
            // lo mandamos a la cartelera
            this.router.navigate(['/']);

        } catch (error: any) {
            console.error("Error exacto de Supabase:", error);
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
            // oauth recarga la pagina
        } catch (error: any) {
            console.error("Error con GitHub:", error);
            this.errorMessage.set('Error al conectar con GitHub.');
            this.isLoading.set(false);
        }
    }
}