#include "IbycusFile.h"

__IBYCUS_BEGIN_NAMESPACE

ibyFile & ibyFile::operator>>(ibystring_t & rhs) {
        ibychar_t ch;
        rhs.erase();

        while (!((ch = get()) & HIGHBIT))
                rhs += ch;
        putback(ch);
        return *this;
}

__IBYCUS_END_NAMESPACE
