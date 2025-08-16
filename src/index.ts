interface Window {
    monaco: any;
}

require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs' } });

require(['vs/editor/editor.main'], () => {
    const editorOptions = {
        language: 'html',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: {
            enabled: false
        },
        lineNumbers: true,
        glyphMargin: false,
        folding: true,
        tabSize: 4,
        insertSpaces: false,
        formatOnPaste: true,
        formatOnType: true,
        fontFamily: 'Fira Code, monospace',
        fontSize: 13,
        fontLigatures: true,
        scrollBeyondLastLine: false
    };

    const selectorInput = document.getElementById('selectorInput') as HTMLInputElement;
    const toggleContent = document.getElementById('toggleContent') as HTMLInputElement;
    const copyButton = document.getElementById('copyButton') as HTMLButtonElement;

    const updateOutput = () => {
        selectorInput.classList.remove('border-red-500', 'focus:border-red-500');

        const selectorValue = selectorInput.value.trim();

        copyButton.classList.remove('hidden');
        copyButton.classList.add('flex');

        if (!selectorValue.length) {
            editorOutput.setValue('Please enter a selector');
            copyButton.classList.remove('flex');
            copyButton.classList.add('hidden');
            return;
        }

        try {
            const selectedElements = new DOMParser()
                .parseFromString(editorInput.getValue(), 'text/html')
                .querySelectorAll(selectorValue);

            const commentElement = (text: string) => `<!-- ${text} -->`;

            if (selectedElements?.length) {
                editorOutput.setValue(
                    [
                        commentElement(`Total results: ${selectedElements.length}`),
                        ...Array.from(selectedElements).map((element, index) => {
                            const clonedElement = element.cloneNode(true) as HTMLElement;

                            if (!toggleContent.checked) {
                                clonedElement.innerHTML = '';
                            }

                            return `${commentElement(`Result ${index + 1}`)}\n${clonedElement.outerHTML}`;
                        })
                    ].join('\n\n')
                );
                editorOutput.getAction('editor.action.formatDocument').run();
                return;
            }

            editorOutput.setValue('No elements match the selector');
            copyButton.classList.remove('flex');
            copyButton.classList.add('hidden');
        } catch (error) {
            editorOutput.setValue('Invalid selector');
            selectorInput.classList.add('border-red-500', 'focus:border-red-500');
            copyButton.classList.remove('flex');
            copyButton.classList.add('hidden');
        }
    };

    const [editorInput, editorOutput] = [
        {
            id: 'editorInput',
            options: { ...editorOptions, value: '', minimap: true },
            extras: {
                removeActions: ['editor.action.quickCommand']
            }
        },
        {
            id: 'editorOutput',
            options: { ...editorOptions, value: 'Please enter a selector', readOnly: true },
            extras: {
                removeActions: [
                    'editor.action.clipboardCopyAction',
                    'editor.action.quickOutline',
                    'editor.action.quickCommand',
                    'vs.actions.separator'
                ]
            }
        }
    ]
        .map(({ id, options, extras }) => ({
            editor: window.monaco.editor.create(document.getElementById(id) as HTMLDivElement, options),
            extras
        }))
        .map(({ editor, extras: { removeActions } }) => {
            if (removeActions?.length) {
                const contextMenu = editor.getContribution('editor.contrib.contextmenu');
                const originalMethod = contextMenu._getMenuActions;

                contextMenu._getMenuActions = function () {
                    const filteredOptions = originalMethod
                        .apply(contextMenu, arguments)
                        .filter((action: { id: string }) => !removeActions.includes(action.id));

                    return filteredOptions.slice(
                        0,
                        filteredOptions[filteredOptions.length - 1]?._id !== 'vs.actions.separator'
                            ? filteredOptions.length
                            : -1
                    );
                };
            }

            return editor;
        });

    editorInput.onDidChangeModelContent(updateOutput);
    selectorInput.addEventListener('input', updateOutput);
    toggleContent.addEventListener('change', updateOutput);
    copyButton.addEventListener('click', async (e) => {
        const buttonElement = e.currentTarget as HTMLButtonElement;

        const copyIcon = buttonElement.querySelector('.copy-icon') as HTMLDivElement;
        const copyFinish = buttonElement.querySelector('.copy-finish') as HTMLDivElement;

        copyIcon.classList.add('hidden');

        const extractedElements = editorOutput.getValue();
        await navigator.clipboard.writeText(extractedElements || '');

        copyFinish.classList.remove('hidden');

        setTimeout(() => {
            copyIcon.classList.remove('hidden');
            copyFinish.classList.add('hidden');
        }, 600);
    });
});
