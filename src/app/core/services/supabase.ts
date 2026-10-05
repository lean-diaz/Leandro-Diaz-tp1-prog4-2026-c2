import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root' // creamos una sola instancia para toda la app
})

export class SupabaseService {
    // Cambiamos a public para que el AuthService pueda usar este puente
    public supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient( // Agarra la variable privada y abre el puente de internet guardando la conexión real
            environment.supabaseUrl, // dirección del servidor
            environment.supabaseKey // llave de acceso público
        );
    }

    async getPeliculas() { // avisa que va a tomarse su tiempo (viaja a internet) y no debe congelar la página.
        const { data, error } = await this.supabase // Frena a esperar la respuesta y desestructura los cajones 'data' y 'error'.
        // de la tabla peliculas, traemos todas las columnas
        .from('peliculas')
        .select('*'); 

        // Si hay error, imprimimos el error y devolvemos un array vacio para que la pagina no se rompa
        if (error) {
        console.error('Error trayendo películas:', error.message);
        return [];
        }
    
        return data; // Si no hubo error, devuelve las películas encontradas.
    }

    // Nueva función: Recibe un ID (que viene como texto desde la URL)
    async getPeliculaById(id: string) {
        const { data, error } = await this.supabase
        .from('peliculas')
        .select('*')
        .eq('id', id) // LÓGICA SQL: "Donde la columna 'id' sea igual a esta variable"
        .single();    // LÓGICA: "Traeme un solo objeto, no me traigas un array"

        if (error) {
            console.error('Error buscando la película:', error.message);
            return null;
        }
    
        return data;
    }

    // Busca todas las funciones que correspondan a una película específica
    async getFuncionesDePelicula(peliculaId: string) {
        const { data, error } = await this.supabase
        .from('funciones')
        .select('*, salas(nombre)') // MAGIA RELACIONAL: Trae la función y también el nombre de la sala conectada
        .eq('pelicula_id', peliculaId)
        .order('fecha_hora', { ascending: true }); // Las ordena cronológicamente

        if (error) {
            console.error('Error buscando funciones:', error.message);
            return [];
        }
    
        return data;
    }

    // Trae todo el catálogo del Candy Bar
    async getProductosCandy() {
        const { data, error } = await this.supabase
        .from('productos')
        .select('*');

        if (error) {
            console.error('Error trayendo el Candy Bar:', error.message);
            return [];
        }
        return data;
    }

    // NUEVO: Inserta una fila en la base de datos y devuelve el ticket generado
    async registrarCompra(datosCompra: any) {
        const { data, error } = await this.supabase
        .from('compras')
        .insert(datosCompra)
        .select()   // Pide que la base le devuelva la fila recién creada
        .single();  // Asegura que devuelva un solo objeto, no un array

        if (error) {
            console.error('Error en la transacción:', error.message);
            return null;
        }
        return data;
    }
}