# JavaScript Auto Backticks

![](https://img.shields.io/visual-studio-marketplace/i/chamboug.js-auto-backticks)
![](https://img.shields.io/visual-studio-marketplace/r/chamboug.js-auto-backticks)
![](https://img.shields.io/visual-studio-marketplace/last-updated/chamboug.js-auto-backticks)
![](https://img.shields.io/visual-studio-marketplace/v/chamboug.js-auto-backticks)

## Overview

This extension will automatically convert single or double quotes to backticks when needed.

Just start typing a regular string, the extension will transform it into a template literal as soon as it detects placeholders (`${}`).

![alt text](images/demo.gif "Automatic replace")

> ⚠️ Breaking Change: Since version 1.2.0, the `revertEnabled` setting has been renamed to `enableRevert`. Additionally, its default value has been changed from `true` to `false`. Please ensure to update your configuration accordingly.

## Features

1. **User-friendly**: _JavaScript Auto Backticks_ is designed to be user-friendly and requires no configuration for immediate use.

1. **TypeScript Handling**: This extension is specifically designed to work seamlessly with both JavaScript and TypeScript languages.

1. **Smart Quotes Recognition**: _JavaScript Auto Backticks_ is smart enough to differentiate escaped quotes within a string. It ensures that only the quotes that should be part of the template literal are converted to backticks, leaving the escaped quotes unchanged.

1. **Handling Pasted Text**: This extension handles pasted text. If you paste code containing `${`, the extension will instantly convert the applicable quotes to backticks as required.

## Settings

| Key                                       | Description                                                                    | Default value |
| ----------------------------------------- | ------------------------------------------------------------------------------ | ------------- |
| js-auto-backticks.enableRevert            | Revert to regular quotes after removing last placeholder of a template string. | false         |
| js-auto-backticks.preferredStandardQuotes | Specifies preferred quotation marks when reverting standard string.            | auto          |

## License

This project is licensed under the MIT License.

## Contributing

Contributions to the _JavaScript Auto Backticks_ extension are welcome! If you encounter any issues or have suggestions for improvements, please feel free to submit a pull request or create an issue in the project repository on GitHub.

---

Happy coding with _JavaScript Auto Backticks_! If you find this extension helpful, don't forget to give it a ⭐ on the Visual Studio Code Marketplace. Thank you!
