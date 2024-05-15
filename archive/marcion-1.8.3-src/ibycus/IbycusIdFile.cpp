#include "IbycusIdFile.h"

__IBYCUS_BEGIN_NAMESPACE

ibyIdFile::~ibyIdFile()
{
}

ibyIdFile & operator>>(ibyIdFile & s, IbycusId & rhs) {
        rhs.Read(s, s.last_id);
        s.last_id = rhs;
        return s;
}

__IBYCUS_END_NAMESPACE
