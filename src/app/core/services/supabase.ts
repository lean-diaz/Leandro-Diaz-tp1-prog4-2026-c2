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

    // --- CRUD ADMIN PRODUCTOS ---

    async crearProducto(producto: any) {
        const { data, error } = await this.supabase
            .from('productos')
            .insert(producto)
            .select()
            .single();

        if (error) {
            console.error('Error creando producto:', error.message);
            return null;
        }
        return data;
    }

    async actualizarProducto(id: number, producto: any) {
        const { data, error } = await this.supabase
            .from('productos')
            .update(producto)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error actualizando producto:', error.message);
            return null;
        }
        return data;
    }

    async eliminarProducto(id: number) {
        const { error } = await this.supabase
            .from('productos')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error eliminando producto:', error.message);
            return false;
        }
        return true;
    }

    // NUEVO: Inserta una fila en la base de datos y previene la concurrencia (robo de butacas)
    async registrarCompra(datosCompra: any) {
        try {
            // 1. EL DOBLE CHEQUEO (Filtro Anti-Robo de butacas)
            // Traemos las compras actuales de ESTA función.
            const { data: comprasPrevias, error: errorChequeo } = await this.supabase
                .from('compras')
                .select('butacas')
                .eq('funcion_id', datosCompra.funcion_id);

            if (errorChequeo) throw errorChequeo;

            // Extraemos y aplanamos todas las butacas que ya están vendidas en la base
            const butacasYaVendidas = comprasPrevias.flatMap(compra => compra.butacas);

            // Filtramos a ver si alguna de las butacas de NUESTRO carrito está en el array de vendidas
            const butacasPellizcadas = datosCompra.butacas.filter((b: string) => butacasYaVendidas.includes(b));

            if (butacasPellizcadas.length > 0) {
                // Alguien fue más rápido. Abortamos la compra devolviendo un aviso.
                return {
                    exito: false,
                    mensaje: `¡Qué lástima! Las butacas ${butacasPellizcadas.join(', ')} acaban de ser reservadas por otra persona.`
                };
            }

            // 2. EL PAGO (Si pasamos el filtro, guardamos la compra)
            const { data, error } = await this.supabase
                .from('compras')
                .insert(datosCompra)
                .select()   // Pide que la base le devuelva la fila recién creada
                .single();  // Asegura que devuelva un solo objeto

            if (error) throw error;

            // Devolvemos objeto de éxito con el ticket
            return { exito: true, ticket: data };

        } catch (error: any) {
            console.error('Error en la transacción:', error.message);
            return { exito: false, mensaje: 'Error al procesar el pago en el servidor.' };
        }
    }

    // NUEVO: Busca un cupón por código para aplicar descuentos
    async validarCupon(codigoInput: string) {
        // Pasamos todo a mayúsculas por si el usuario escribe "bienvenida20"
        const codigoLimpio = codigoInput.trim().toUpperCase();

        const { data, error } = await this.supabase
            .from('cupones')
            .select('*')
            .eq('codigo', codigoLimpio)
            .eq('activo', true) // Solo traemos cupones que estén prendidos
            .single(); // Esperamos un solo resultado

        if (error) {
            // Si el error es PGRST116 (No rows found), significa que el cupón no existe, no es un error grave.
            if (error.code !== 'PGRST116') {
                console.error('Error buscando cupón:', error.message);
            }
            return null;
        }

        return data;
    }

    // --- MÉTODOS PARA EL ESCÁNER QR ---

    async getCompraPorId(ticketId: string) {
        const { data, error } = await this.supabase
            .from('compras')
            .select('*, funciones(*, peliculas(nombre), salas(nombre))') // Traemos info completa para mostrarle al empleado
            .eq('id', ticketId)
            .single();

        if (error) {
            return null;
        }
        return data;
    }

    async quemarTicket(ticketId: string) {
        const { data, error } = await this.supabase
            .from('compras')
            .update({ qr_usado: true })
            .eq('id', ticketId)
            .select()
            .single();

        if (error) {
            console.error('Error quemando ticket:', error.message);
            return false;
        }
        return true;
    }


    // --- MÉTODO PARA AUDITORÍA (EL GRAN HERMANO) ---
    async registrarAuditoria(accion: string) {
        // 1. Obtenemos al usuario que está logueado actualmente
        const { data: userData } = await this.supabase.auth.getUser();
        const email = userData.user?.email || 'admin@desconocido.com';

        // 2. Insertamos el registro en la tabla oculta
        const { error } = await this.supabase
            .from('auditoria')
            .insert({
                usuario_email: email,
                accion: accion
            });

        if (error) {
            console.error('Error guardando en auditoría:', error.message);
        }
    }



}