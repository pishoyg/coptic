/*
 * IbycusAuthTab.h: IbycusAuthTab class --
 *    Interface to a PHI/TLG AUTHTAB.DIR file
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
 * $Date: 2001/10/11 22:12:35 $
 * $Author: seanredmond $
 */

#ifndef	_IBYCUSAUTHTAB_H_
#define _IBYCUSAUTHTAB_H_

#include <string.h>

#include "IbycusDefs.h"
#include "IbycusFile.h"
#include "IbycusAuthTabCorpus.h"
#include "IbycusParseException.h"
#include "IbycusFileException.h"

__IBYCUS_BEGIN_NAMESPACE
class IbycusAuthTab
{
public:
	IbycusAuthTab() {};
	IbycusAuthTab(const ibystring_t & dn, const ibystring_t & fn = "AUTHTAB.DIR")
		throw(IbycusFileException, IbycusParseException);
	virtual ~IbycusAuthTab() {};
	int Count() const { return corpora_.size(); };
	int Count(const ibystring_t & tag) const throw(IbycusException);
	int Count(int index) const throw(IbycusException);
	int Index(const ibystring_t & tag) const throw(IbycusException);
	const ibystring_t & Name(int index) const;
	const ibystring_t & Name(int corpus, int author) const throw(IbycusException);
	const ibystring_t & Id(int corpus, int author) const throw(IbycusException);
	const ibystring_t & Tag(int index) const;
	int AliasCount(int corpus, int author) const throw(IbycusException);
	const ibystring_t & Alias(int corpus, int author, int alias) const
		throw(IbycusException);
	void operator=(const IbycusAuthTab & rhs)
		{ corpora_ = rhs.corpora_; };

private:
	vector<ibyAuthTabCorpus> corpora_;

};


__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSAUTHTAB_H_ */
