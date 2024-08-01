import typing

import type_enforced

ENABLED = True

Callable = typing.Callable | type_enforced.enforcer.FunctionMethodEnforcer
OptionalCallable = typing.Optional[Callable]
