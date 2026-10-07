import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class AuthService {
    // Nuestro "Pase VIP" general (la sesión de GitHub)
    readonly session = signal<any | null>(null);
    
    // NUEVO: El nivel de permisos (admin, empleado, cliente)
    readonly rol = signal<string | null>(null);

    constructor(private supabaseService: SupabaseService) {
        // 1. Cuando se abre la app
        this.supabaseService.supabase.auth.getSession().then(({ data }) => {
            this.session.set(data.session);
            // Si hay sesión activa, vamos a buscar el rol a la base de datos
            if (data.session?.user) {
                this.cargarRol(data.session.user.id);
            }
        });

        // 2. Nos quedamos escuchando cambios de sesión
        this.supabaseService.supabase.auth.onAuthStateChange((_event, session) => {
            this.session.set(session);
            if (session?.user) {
                this.cargarRol(session.user.id);
            } else {
                // Si cerró sesión, le borramos el rol para que no quede guardado por error
                this.rol.set(null);
            }
        });
    }

    // NUEVO: Método privado que consulta a tu nueva tabla 'perfiles'
    private async cargarRol(userId: string) {
        const { data, error } = await this.supabaseService.supabase
            .from('perfiles')
            .select('rol')
            .eq('id', userId) // Busca la fila donde el ID coincida con el usuario logueado
            .single(); // Trae un solo resultado, no un array

        if (data && !error) {
            this.rol.set(data.rol); // Guarda "admin" (o "cliente") en el Signal
        } else {
            console.error('Error al cargar el rol:', error);
            // Si hay un error, lo rebajamos a cliente normal por seguridad
            this.rol.set('cliente'); 
        }
    }

    // Llama a la ventana de GitHub
    login() {
        return this.supabaseService.supabase.auth.signInWithOAuth({ 
            provider: 'github',
            options: {
                redirectTo: window.location.origin // Redirige automáticamente a localhost o a Vercel según dónde estés
            }
        });
    }

    // Destruye el Pase VIP
    logout() {
        return this.supabaseService.supabase.auth.signOut();
    }
}