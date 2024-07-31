import colorama

colorama.init(autoreset=True)


def red(arg) -> None:
    print(colorama.Fore.RED + arg)
