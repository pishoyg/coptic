"""Lazy evaluation!"""

# TODO: (#221) The LazyStaticProperty could be used elsewhere. Adopt it more
# widely.
# TODO: (#221) Define a LazyDynamicProperty decorator as well.
import typing

T = typing.TypeVar("T")


class LazyStaticProperty(typing.Generic[T]):
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
