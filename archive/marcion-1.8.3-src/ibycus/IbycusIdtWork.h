/*
 * IbycusIdtWork.h: ibyIdtWork class --
 *    Work in an ibyIdtAuth
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
 * $Date: 2001/10/11 22:00:04 $
 * $Author: seanredmond $
 */

#ifndef	_IBYCUSIDTWORK_H_
#define _IBYCUSIDTWORK_H_

#include "IbycusIdFile.h"
#include "IbycusIdtSection.h"
#include "IbycusParseException.h"

__IBYCUS_BEGIN_NAMESPACE
typedef map<unsigned char, ibystring_t, less<unsigned char> > level_map_t;

class ibyIdtWork
{
public:
	ibyIdtWork()
		: _length(0), _block(0), _start_pos(0), _end_header(0),
		_SectsReady(false)
		{};
	virtual ~ibyIdtWork() {};
	void Read(ibyIdFile & s);
	const ibystring_t & Name() const { return _name; };
	// TODO: implement Id() for IdtSections
	const IbycusId & Id(const int sect = -1) const { return _id; };
	int Count(ibyIdFile & s) throw(IbycusParseException)
		{ _Get(s); return _Sections.size(); };
	const IbycusId & Start(ibyIdFile & s, const int sect = 0) throw(IbycusParseException)
		{ _Get(s); return _Sections[sect].Start(); };
	const IbycusId & End(ibyIdFile & s, int sect = -1);
	ibylen_t Block(ibyIdFile & s, const int sect,
		const IbycusId & id) throw(IbycusNoId, IbycusParseException);
	int Span(ibyIdFile & s, const int sect = 0) throw(IbycusParseException)
		{ _Get(s); return _Sections[sect].Span(); };
	int CiteLevels() const
		{ return _levelDesc.size(); }

private:
	ibylen_t _length;
	ibylen_t _block;
	IbycusId _id;
	ibystring_t _name;
	vector<ibyIdtSection> _Sections;
	ibyIdFile::pos_type _start_pos, _end_header;
	level_map_t _levelDesc;
	bool _SectsReady;

	void _Get(ibyIdFile & s) throw(IbycusParseException);

friend ibyIdFile & operator>>(ibyIdFile & s, ibyIdtWork & rhs);
};


__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSIDTWORK_H_ */
