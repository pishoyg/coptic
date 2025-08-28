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

import functools
import typing


class StaticProperty[T]:
    """A descriptor for creating lazy-loaded, cached static properties.

    The decorated function is executed only on the first access.
    NOTE: This is NOT thread- or process-safe!
    """

    def __init__(self, func: typing.Callable[[], T]):
        self.func: typing.Callable[[], T] = func
        self.name: str = func.__name__
        # Copy over the docstring and other metadata from the original function.
        self.__doc__ = func.__doc__

    def __get__(self, _: object | None, owner: type) -> T:
        # 'owner' is the class the descriptor is attached to
        result = self.func()
        setattr(owner, self.name, result)
        return result


# A TypeVar is used to represent a generic function type.
# This allows us to preserve the signature of the decorated function.
F = typing.TypeVar("F", bound=typing.Callable[..., typing.Any])


def run_once(f: F) -> F:
    """A decorator that ensures a function or method runs only once.

    For methods, it ensures it runs only once *per instance*.
    Subsequent calls will do nothing and return None.

    The function executes only once, even if:
    - The first execution fails.
    - The first execution hasn't returned (in a recursive function).

    Args:
        f: Function or method to be executed only once.

    Returns:
        Wrapped function.
    """

    @functools.wraps(f)
    def wrapper(*args: typing.Any, **kwargs: typing.Any) -> typing.Any:
        # The first argument of a method is the instance 'self'.
        # For a regular function, there are no instances.
        # We use the function object itself as the storage target for functions.
        # We use the instance as the storage target for methods.

        # Determine the target object to store the 'has_run' flag on.
        # If 'args' is not empty, it's likely a method, and args[0] is 'self'.
        # We check if it has a __dict__ to be sure it's an object instance.
        if args and hasattr(args[0], "__dict__"):
            target = args[0]
        else:
            target = f

        # Create a unique attribute name to avoid collisions.
        attr_name = "_has_run_" + f.__name__

        # Check if the attribute exists and is True.
        if not getattr(target, attr_name, False):
            # If it hasn't run, set the flag to True.
            setattr(target, attr_name, True)
            # Execute the original function and return its result.
            return f(*args, **kwargs)
        # If it has already run, do nothing and return immediately.

    return wrapper  # type: ignore[return-value]
