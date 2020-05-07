exports.genReply = (veracity, replyText) => {
    switch (veracity){
        case 'verdadeiro':
            return [`Olá! Chegamos à conclusão que a mensagem é:`,
                    `         ✅✅*VERDADEIRA!*✅✅`,
                    replyText,
                    '',
                    'Pode compartilhar à vontade!',
                    '',
                    'Continue nos enviando mensagens quando tiver dúvida sobre a veracidade!',
                    'É um prazer ajudar!😉'
                    ].join('\n')
        case 'falso':
            return [`Olá! Chegamos à conclusão que a mensagem é:`,
                    `           ❌❌*FALSA!*❌❌`,
                    replyText,
                    '',
                    '*Por favor, não compartilhe essa mensagem!*',
                    'Avise quem te enviou também, para evitar que ela se espalhe mais!',
                    '',
                    'Continue nos enviando mensagens quando tiver dúvida sobre a veracidade!',
                    'É um prazer ajudar!😉'
                    ].join('\n')
        case 'indeterminado':
                return [`Olá! Não pudemos determinar a veracidade da mensagem.`,
                        replyText,
                        '',
                        '*Por favor, tenha cuidado ao compartilhar essa mensagem!*',
                        'Na dúvida, é melhor não espalhar.',
                        '',
                        'Continue nos enviando mensagens quando tiver dúvida sobre a veracidade!',
                        'É um prazer ajudar!😉'
                        ].join('\n')
        case 'semcontexto':
                return [`Olá! Chegamos à conclusão que a mensagem está:`,
                        `           ‼️*FORA DE CONTEXTO!*‼️`,
                        replyText,
                        '',
                        '*Por favor, tenha cuidado ao compartilhar essa mensagem!*',
                        'Se for compartilhar, explique o contexto.',
                        '',
                        'Continue nos enviando mensagens quando tiver dúvida sobre a veracidade!',
                        'É um prazer ajudar!😉'
                        ].join('\n')     
        case 'empartes':
                return [`Olá! Chegamos à conclusão que a mensagem é:`,
                        `        ‼️*FALSA EM PARTES*‼️`,
                        replyText,
                        '',
                        '*Por favor, tenha cuidado ao compartilhar essa mensagem!*',
                        'Se for compartilhar, explique o contexto.',
                        '',
                        'Continue nos enviando mensagens quando tiver dúvida sobre a veracidade!',
                        'É um prazer ajudar!😉'
                        ].join('\n')  
    return replyText;
    }
}

exports.genGuidelines = () => {
        return ['Diretrizes para avaliação de mensagens no "É Verdade"',
                ['*1-Blabla:* Explicação do blabla',
                ['*2-blalbalba:*  Explicação do blablabla']]
                ].join('\n')

}
