/*
 * IbycusIdException.h: ibyIdException class --
 *    Class for libycus ID exceptions
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

#ifndef	_IBYCUSIDEXCEPTION_H_
#define _IBYCUSIDEXCEPTION_H_

#include "IbycusIdFile.h"
#include "IbycusId.h"
#include "IbycusParseException.h"

/* N.B., ibyIdException is NOT an exception in the sense of
 * 'exception handling'. Classes intended to be thrown as an
 * exception are IbycusException and its subclasses.
 */


__IBYCUS_BEGIN_NAMESPACE
class ibyIdException
{
public:
	ibyIdException() : _Block(0) {};
	ibyIdException(ibyIdFile & idt);
	virtual ~ibyIdException();
	void SetEnd(ibyIdFile & idt);
	bool operator<(const ibyIdException & rhs) const;
	bool operator==(const ibyIdException & rhs) const;

private:
	ibylen_t _Block;
	IbycusId _StartId;
	IbycusId _EndId;
};


__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSIDEXCEPTION_H_ */
