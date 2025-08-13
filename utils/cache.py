"""Primitives for caching function output!

1. For a non-static class method, you can use the functools.cached_property
   decorator to cache its output.
2. For a static class method, you can use the StaticProperty decorator defined
   below. (We could use functools.lru_cache for caching, but we tend to prefer
   this syntax.)
3. For a function (non-class method), you have two options:
   a. Use functools.lru_cache for caching.
   b. Implement it as a class method, and use the StaticProperty decorator.
"""

import typing

T = typing.TypeVar("T")


class StaticProperty(typing.Generic[T]):
    """A descriptor for creating lazy-loaded, cached static properties.

    The decorated function is executed only on the first access.
    """

    def __init__(self, func: typing.Callable[[], T]):
        self.func: typing.Callable[[], T] = func
        self.name: str = func.__name__
        # Copy over the docstring and other metadata from the original function.
        self.__doc__ = func.__doc__

    # The @typing.overload is crucial for type checkers to understand the
    # behavior.
    @typing.overload
    def __get__(self, _: None, owner: type) -> T: ...

    @typing.overload
    def __get__(self, _: object, owner: type) -> T: ...

    def __get__(self, _: object | None, owner: type) -> T:
        # 'owner' is the class the descriptor is attached to
        result = self.func()
        setattr(owner, self.name, result)
        return result
