import { Pipe, PipeTransform } from '@angular/core';

// @Pipe le dice a Angular cómo se va a llamar esta herramienta en el HTML
@Pipe({
    name: 'precioArs',
    standalone: true
})

export class PrecioArsPipe implements PipeTransform {

    // transform() es la función obligatoria de todo Pipe. 
    // Recibe un número (ej: 39000) y devuelve un texto (ej: $ 39.000,00)
    transform(value: number): string {
        if (value == null) return '$ 0,00';
    
        // Usamos una herramienta nativa de JavaScript para formatear moneda argentina
        return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
        }).format(value);
    }
}