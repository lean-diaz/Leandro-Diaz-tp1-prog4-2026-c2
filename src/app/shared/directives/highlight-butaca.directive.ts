import { Directive, input, computed } from '@angular/core';

@Directive({
    // El selector entre corchetes significa que se usa como un atributo HTML
    selector: '[appHighlightButaca]',
    standalone: true,
    // host es la magia de Angular 22: inyecta clases CSS al elemento padre automáticamente
    host: {
        '[class.vip]': 'isVip()',
        '[class.accesible]': 'isAccesible()'
    }
})

export class HighlightButacaDirective {

    // input.required() exige que desde el HTML le pasemos sí o sí la letra (ej: 'T')
    appHighlightButaca = input.required<string>();

    // Computeds que evalúan la letra. Si devuelven true, el 'host' de arriba aplica la clase CSS
    isVip = computed(() => ['R', 'S', 'T'].includes(this.appHighlightButaca()));
    isAccesible = computed(() => ['J', 'K'].includes(this.appHighlightButaca()));
}