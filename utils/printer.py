import typing

import colorama

colorama.init(autoreset=True)


def _func(color) -> typing.Callable:
    return lambda arg: print(color + arg)


black = _func(colorama.Fore.BLACK)
red = _func(colorama.Fore.RED)
green = _func(colorama.Fore.GREEN)
yellow = _func(colorama.Fore.YELLOW)
blue = _func(colorama.Fore.BLUE)
magenta = _func(colorama.Fore.MAGENTA)
cyan = _func(colorama.Fore.CYAN)
white = _func(colorama.Fore.WHITE)
