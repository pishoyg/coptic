/*
 * IbycusString.h: ibystring_t class --
 *
 * Copyright (c) 2000  Sean Redmond
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *
 * $Revision: 1.2 $
 * $Date: 2001/10/11 18:59:41 $
 * $Author: seanredmond $
 */
#ifndef	_IBYCUSSTRING_H_
#define _IBYCUSSTRING_H_

#include "IbycusDefs.h"

__IBYCUS_BEGIN_NAMESPACE
typedef char ibychar_t;
typedef basic_string<ibychar_t> ibystring_base;


class len_string : public virtual ibystring_base {};

class ibystring_t : public virtual ibystring_base, public len_string
{
public:
	ibystring_t() : ibystring_base() {};
	ibystring_t(const char* c) : ibystring_base(c) {};
	ibystring_t(const ibystring_base & s) : ibystring_base(s) {};
	ibystring_t & operator=(const ibystring_t & rhs)
		{ ibystring_base::operator=(rhs); return *this; };
	ibystring_t & operator=(int i)
		{ ibystring_base::operator=(i); return *this; };
};
__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSEXCEPTION_H_ */
