/*
 * IbycusIdtAuth.h: ibyIdtAuth class --
 *    Author in an IbycusIdtFile
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
 * $Revision: 1.5 $
 * $Date: 2001/10/11 22:02:07 $
 * $Author: seanredmond $
 */

#ifndef	_IBYCUSIDTAUTH_H_
#define _IBYCUSIDTAUTH_H_

#include "IbycusIdFile.h"
#include "IbycusIdtWork.h"
#include "IbycusId.h"
#include "IbycusParseException.h"

__IBYCUS_BEGIN_NAMESPACE
class ibyIdtAuth
{
public:
	ibyIdtAuth() throw(IbycusParseException) : length(0), block(0), start_pos(0), current_work_index_(-1) {};
	void Read(ibyIdFile & s) throw(IbycusParseException);

	int Count(ibyIdFile & idt, const int work);
	void Get(ibyIdFile & s, const int work = -1, const int sect = -1);
	virtual ~ibyIdtAuth() {};
	const ibystring_t & Name(const int work = -1)
		{ return (work > -1) ? current_work_.Name() : _name; };
	const IbycusId & Id(const int work = -1, const int sect = -1) const
		{ return (work > -1) ? current_work_.Id(sect) : _id; };
	const IbycusId & Start(ibyIdFile & s, const int work = 0,
		const int sect = 0)
		{ Get(s,work,sect); return current_work_.Start(s, sect); };
	const IbycusId & End(ibyIdFile & s, int work, int sect);
	ibylen_t Block(ibyIdFile & s, const int work,
		const int sect, const IbycusId & id) throw(IbycusNoId);
	int Span(ibyIdFile & s, const int work = 0, const int sect = 0)
		{ Get(s,work,sect); return current_work_.Span(s, sect); };
	int CiteLevels(ibyIdFile & s, int work=0)
		{ Get(s, work); return current_work_.CiteLevels(); };


private:
	ibylen_t length;
	ibylen_t block;
	ibyIdFile::pos_type start_pos;
	int current_work_index_;
	ibyIdFile::pos_type end_header_;
	IbycusId _id;
	ibystring_t _name;
	//len_string _name;

	ibyIdtWork current_work_;


friend ibyIdFile & operator>>(ibyIdFile & s, ibyIdtAuth & rhs) throw(IbycusParseException);
};

__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSIDTAUTH_H_ */
