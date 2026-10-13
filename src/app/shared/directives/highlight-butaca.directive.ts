import { Directive, input, computed } from '@angular/core';

@Directive({
    selector: '[appHighlightButaca]',
    standalone: true,
    // inyecto clases css al elemento padre de manera automatica
    host: {
        '[class.vip]': 'isVip()',
        '[class.accesible]': 'isAccesible()'
    }
})

export class HighlightButacaDirective { 
    // exijo que me pasen la letra de la butaca obligatoriamente
    appHighlightButaca = input.required<string>();

    // evaluo si corresponde al grupo vip
    isVip = computed(() => ['R', 'S', 'T'].includes(this.appHighlightButaca()));
    // evaluo si corresponde al grupo accesible
    isAccesible = computed(() => ['J', 'K'].includes(this.appHighlightButaca()));
}