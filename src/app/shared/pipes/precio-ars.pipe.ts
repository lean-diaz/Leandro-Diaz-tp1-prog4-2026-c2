import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'precioArs',
    standalone: true
})

export class PrecioArsPipe implements PipeTransform {
    // transformo el numero recibido en un texto con formato de dinero
    transform(value: number): string {
        if (value == null) return '$ 0,00';
    
        // aplico el formato de moneda
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(value);
    }
}