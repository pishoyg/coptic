#include "IbycusIdException.h"

__IBYCUS_BEGIN_NAMESPACE

ibyIdException::ibyIdException(ibyIdFile & idt)
{
        try {
                idt >> _Block;
                idt >> _StartId;
        } catch (IbycusParseException E) {
                throw E;
        }
}

ibyIdException::~ibyIdException()
{
}

void ibyIdException::SetEnd(ibyIdFile & idt)
{
        if (_StartId.IsNull())
                throw IbycusException("Cannot initialize null exception");

        try {
                idt >> _EndId;
        } catch (IbycusParseException E) {
                throw E;
        }
}

bool ibyIdException::operator<(const ibyIdException & rhs) const
{
        return _StartId < rhs._StartId;
}

bool ibyIdException::operator==(const ibyIdException & rhs) const
{
        if (_StartId == rhs._StartId)
                return _EndId == rhs._EndId;
        return false;
}

__IBYCUS_END_NAMESPACE
