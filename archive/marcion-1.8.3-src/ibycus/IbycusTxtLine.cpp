#include "IbycusTxtLine.h"

__IBYCUS_BEGIN_NAMESPACE

ibyTxtLine::ibyTxtLine(ibyIdFile & src) : Id_(IbycusId(src, src.last_id))
{
        if (Id_.Flag() == IbycusId::NOFLAG)
                src >>Text_;
}

void ibyTxtLine::Clear()
{
        Id_.Clear();
        Text_.erase();
}

void ibyTxtLine::Read(ibyIdFile & src)
{
        if (Id_.Flag() != IbycusId::NOFLAG)
                Id_.Clear();
        Text_.erase();

        src >> Id_;
        ibychar_t c;
        while (!((c = src.get()) & HIGHBIT))
                Text_ += c;
        src.putback(c);
}

__IBYCUS_END_NAMESPACE
