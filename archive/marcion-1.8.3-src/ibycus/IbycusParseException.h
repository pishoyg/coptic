/*
 * IbycusParseException.h: IbycusParseException class --
 *    Exception class
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
 * $Revision: 1.4 $
 * $Date: 2001/10/11 20:10:08 $
 * $Author: seanredmond $
 */

#ifndef	_IBYCUSPARSEEXCEPTION_H_
#define _IBYCUSPARSEEXCEPTION_H_

#include <stdexcept>
#include "IbycusDefs.h"

__IBYCUS_BEGIN_NAMESPACE
class IbycusParseException : public IbycusException
{
public:
	IbycusParseException(ibystring_t msg="", int off=0) : IbycusException(msg, off)
		{type = "parse";};
        virtual ~IbycusParseException() throw() {};
	int offset;
	ibystring_t type;

};

__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSPARSEEXCEPTION_H_ */
